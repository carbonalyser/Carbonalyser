// last time we got traffic on the wire
let lastTimeTrafficSeen = null;

printDebug = (msg) => {
  printDebugOrigin("trafficAnalyzer " + msg);
}

/**
 * a copy of storage that is writted periodically.
 * warning it holds delta not real values.
 */
 buffer = {rawdata: {}};

/**
 * This is trigger when a download start.
 * Since the we can grab only the download start, we have to check manually for its completion.
 */
downloadCompletedCheckLoop = async (object) => {
  lastTimeTrafficSeen = Date.now();
  for(downloadItem of (await obrowser.downloads.search({id: object.id}))) {
    if ( downloadItem.state == "complete" ) {
      const origin = extractHostname(!downloadItem.referrer ? downloadItem.url : downloadItem.referrer);

      if ( buffer.rawdata[origin] === undefined ) {
        buffer.rawdata[origin] = createEmptyRawData();
      }

      buffer.rawdata[origin].datacenter.total += (downloadItem.bytesReceived);
      buffer.rawdata[origin].network.total += (BYTES_TCP_HEADER + BYTES_IP_HEADER);
      return;
    }
  }
  setTimeout(downloadCompletedCheckLoop, await getPref("daemon.download.loopMs"), object);
}

const BYTES_TCP_HEADER = 20;
const BYTES_IP_HEADER  = 20;
// Headers line are always terminated by CRLF cf https://stackoverflow.com/questions/5757290/http-header-line-break-style
const BYTES_HTTP_END   = 2;

/**
 * Get origin from request details.
 * Or null if browser is un supported.
 */
getOriginFromRequestDetail = (requestDetails) => {
  let result = null;
  if ( isFirefox() ) {
    result = extractHostname(!requestDetails.originUrl ? requestDetails.url : requestDetails.originUrl);
  } else if (isChrome()) {
    result = extractHostname(!requestDetails.initiator ? requestDetails.url : requestDetails.initiator);
  }
  return result;
}

// Exact definition of HTTP headers is here : https://developer.mozilla.org/fr/docs/Web/HTTP/Headers
getBytesFromHeaders = (headers) => {
  let lengthNetwork = BYTES_TCP_HEADER + BYTES_IP_HEADER;
  for(let a = 0; a < headers.length; a ++) {
    const h = headers[a];
    lengthNetwork += (h.name + ": " + h.value).length + BYTES_HTTP_END;
  }
  return lengthNetwork;
}

bufferWritter = async () => {
  const rawdata = await getOrCreateRawData();
  let someData = false;
  for(const origin in buffer.rawdata) {
    someData = true;
    let originStorage = rawdata[origin];
    if ( originStorage === undefined ) {
      originStorage = createEmptyRawData();
      rawdata[origin] = originStorage;
    }
    printDebug("inc origin=" + origin);
    const data = buffer.rawdata[origin];
    for(let classType of ["network", "datacenter"]) {
      const ts = Date.now();
      const originClassTypeStorage = originStorage[classType];
      originClassTypeStorage.total += data[classType].total;
      if ( originClassTypeStorage.dots[ts] === undefined ) {
          originClassTypeStorage.dots[ts] = 0;
      }
      originClassTypeStorage.dots[ts] += data[classType].total;
    }
    rawdata[origin] = originStorage;
  }
  if ( someData ) {

    // Generate stats on the raw data
    await writeStats(rawdata);
    buffer.rawdata = {};
  }
}

/**
 * Get a duration object.
 */
getDuration = async () => {
  let duration = (await obrowser.storage.local.get('duration')).duration;
  if ( duration === undefined ) {
    duration = {
      total: 0,
      set: {}
    }
    await obrowser.storage.local.set({duration: JSON.stringify(duration)});
  } else {
    duration = JSON.parse(duration);
  }
  return duration;
}

let stats = null;
/**
 * Generate and write stats to the storage.
 */
writeStats = async (rawdata) => {
  if ( rawdata === undefined ) {
    rawdata = await getOrCreateRawData();
  }
  stats = getEmptyStatsObject();
  stats.stats = await getStats(rawdata);
  stats.equivalence = await computeEquivalenceFromStatsItem(stats.stats);
  const duration = await getDuration();

  // data
  const bytesDataCenterUnordered = createSumOfData(rawdata, 'datacenter', 60);
  let bytesNetworkUnordered = createSumOfData(rawdata, 'network', 60);
  bytesNetworkUnordered = mergeTwoSOD(bytesDataCenterUnordered, bytesNetworkUnordered);
  fillSODGaps(bytesNetworkUnordered);
  fillSODGaps(bytesDataCenterUnordered);
  stats.bytesDataCenterObjectForm = createObjectFromSumOfData(bytesDataCenterUnordered).sort((a,b) => a.x > b.x);
  stats.bytesNetworkObjectForm = createObjectFromSumOfData(bytesNetworkUnordered).sort((a,b) => a.x > b.x);

  // electricity & electricity in attention time
  stats.electricityDataCenterObjectForm = [];
  stats.electricityNetworkObjectForm = [];
  for(const object of Object.values(duration.set)) {
    object.kWh = 0;
  }
  
  for(const object of [
    {
      bytes: stats.bytesDataCenterObjectForm, 
      electricity: stats.electricityDataCenterObjectForm,
      pref: "general.kWhPerByteDataCenter"
    },
    {
      bytes: stats.bytesNetworkObjectForm, 
      electricity: stats.electricityNetworkObjectForm,
      pref: "general.kWhPerByteNetwork"
    }
  ]) {
    for(const o of object.bytes) {
      const mWh = o.y * ((await getPref(object.pref)) * 1000000.0);
      const kWh = mWh * 0.000001;
      const minute = Math.trunc(((o.x)/1000)/60);
      let key;
      for(key = minute-5; key < minute + 5; key += 1) {
        const durationObj = duration.set[key];
        if ( durationObj !== undefined ) {
          durationObj.kWh += kWh;
          break;
        }
      }
      if ( duration.set[key] === undefined ) {
        duration.set[key] = {duration: 0, kWh: kWh};
      }
      object.electricity.push({x: o.x, y: mWh});
    }
  }

  // update electricity of duration parts
  for(const object of Object.values(duration.set)) {
    object.kWh += (object.duration * (await getPref("general.kWhPerMinuteDevice")));
  }

  // attention time
  stats.attention.time = {labels: [], data: []};
  for(const origin in rawdata) {
    if ( (await getPref("tab.min_attention_time")) < rawdata[origin].attentionTime ) {
      stats.attention.time.labels.push(origin);
      stats.attention.time.data.push(rawdata[origin].attentionTime);
    }
  }

  // forecast
  stats.forecast.dayRateKWh = 0;
  let samples = 0;
  const keys = (Object.keys(duration.set)).sort();
  let stackedDay, dayFirstMin = null;
  const minInday = 60 * 24;
  for(let a = 0; a < keys.length; a = a + 1) {
    const minute = keys[a];
    if ( minInday < (dayFirstMin - minute) ) {
      stats.forecast.dayRateKWh += (stackedDay);
      samples += 1;
      dayFirstMin = null;
    }
    if (dayFirstMin === null ) {
      dayFirstMin = minute;
      stackedDay = 0;
    }
    const durationObj = duration.set[minute];
    stackedDay += durationObj.kWh;
  }
  if ( 0 < stackedDay && samples < 5 ) {
    stats.forecast.dayRateKWh += (stackedDay);
    samples += 1;
  }
  if (0 < samples) {
    stats.forecast.dayRateKWh /= samples;
  }

  // attention efficiency
  stats.attention.efficiency = {labels: [], data: []};
  for(const origin in rawdata) {
    const o = rawdata[origin];
    const od = o.datacenter.total;
    const on = o.network.total;
    if ( rawdata[origin] !== undefined && (await getPref("tab.min_attention_time")) < rawdata[origin].attentionTime  ) {
      stats.attention.efficiency.labels.push(origin);
      stats.attention.efficiency.data.push(rawdata[origin].attentionTime / (od + on));
    }
  }

  await obrowser.storage.local.set({
    rawdata: JSON.stringify(rawdata), 
    stats: JSON.stringify(stats),
    duration: JSON.stringify(duration)
  });
}


// This is triggered when some headers are received.
headersReceivedListener = async (requestDetails) => {
  lastTimeTrafficSeen = Date.now();
  const origin = getOriginFromRequestDetail(requestDetails);
  // Extract bytes from datacenters
  const responseHeadersContentLength = requestDetails.responseHeaders.find(element => element.name.toLowerCase() === "content-length");
  const contentLength = undefined === responseHeadersContentLength ? {value: 0}
   : responseHeadersContentLength;
  const requestSize = parseInt(contentLength.value, 10);

  // Extract bytes from the network
  if ( /^127\.[0-9]+\.[0-9]+\.[0-9]+$/.test(origin) ) {
    // nothing todo
  } else {
    const bnet = getBytesFromHeaders(requestDetails.responseHeaders);
    if ( buffer.rawdata[origin] === undefined ) {
      buffer.rawdata[origin] = createEmptyRawData();
    }
    buffer.rawdata[origin].datacenter.total += requestSize;
    buffer.rawdata[origin].network.total += bnet;
  }
};

// Take amount of data sent by the client in headers
sendHeadersListener = async (requestDetails) => {
  lastTimeTrafficSeen = Date.now();
  const origin = getOriginFromRequestDetail(requestDetails);
  if ( /^127\.[0-9]+\.[0-9]+\.[0-9]+$/.test(origin) ) {
    // nothing todo
  } else {
    const bnet = getBytesFromHeaders(requestDetails.requestHeaders);
    if ( buffer.rawdata[origin] === undefined ) {
      buffer.rawdata[origin] = createEmptyRawData();
      buffer.rawdata[origin].network.total = bnet;
    } else {
      buffer.rawdata[origin].network.total += bnet;
    }
  }
}

setBrowserIcon = (type) => {
  obrowser.browserAction.setIcon({path: `icons/icon-${type}-48.png`});
};

addOneMinute = async () => {
  const duration = await getDuration();
  const minute = Math.trunc((Date.now()/1000)/60);
  duration.total += 1;
  let oneDuration;
  let key;
  let setup = false;
  for(key = minute-5; key < minute + 5; key += 1) {
    if ( duration.set[key] !== undefined ) {
      setup = true;
      break;
    }
  }
  if ( ! setup ) {
    key = minute;
    oneDuration = {duration: 0, kWh: 0};
    duration.set[minute] = oneDuration;
  }
  oneDuration = duration.set[key];
  oneDuration.duration += 1;
  await obrowser.storage.local.set({duration: JSON.stringify(duration)});
  await writeStats(await getOrCreateRawData());
};

let addOneMinuteInterval;
let currentState = '';

handleMessage = async (request) => {
  printDebug("request: {action: " + request.action + ", currentState: " + currentState + "}");
  if ( request.action === currentState ) {
    // event duplicate emission
    printDebug("event duplicate request=" + request.action);
    return;
  }
  switch(request.action) {
    case 'start':
      printDebug("trafficAnalyzer: start");
      setBrowserIcon('on');

      obrowser.webRequest.onHeadersReceived.addListener(
        headersReceivedListener,
        {urls: ['<all_urls>']},
        ['responseHeaders']
      );

      obrowser.webRequest.onSendHeaders.addListener(
        sendHeadersListener,
        {urls: ['<all_urls>']},
        ['requestHeaders']
      );

      await obrowser.downloads.onCreated.addListener(downloadCompletedCheckLoop);

      if (!addOneMinuteInterval) {
        addOneMinuteInterval = setInterval(addOneMinute, 60000);
      }
      break;
    case 'stop':
      printDebug("trafficAnalyzer: stop");
      setBrowserIcon('off');
      obrowser.webRequest.onHeadersReceived.removeListener(headersReceivedListener);
      obrowser.webRequest.onSendHeaders.removeListener(sendHeadersListener);
      obrowser.downloads.onCreated.removeListener(downloadCompletedCheckLoop);
      if (addOneMinuteInterval) {
        clearInterval(addOneMinuteInterval);
        addOneMinuteInterval = null;
      }
      break;
    case 'reinitCIUpdater':
    case 'forceCIUpdater':
      // orders coming for other scripts.
      break;
    default:
      printDebug("Unknow order");
  }
  currentState = request.action;
};

obrowser.runtime.onMessage.addListener(handleMessage);

let storageSynchronizeThread = null;
getPref("daemon.storage.flushingIntervalMs").then((value) => {
  storageSynchronizeThread = setInterval(bufferWritter, value);
});

let restartStorageT = null;
restartStorageF = async () => {
  printDebug("Restarting storage synchronization");
  clearInterval(storageSynchronizeThread);
  storageSynchronizeThread = setInterval(bufferWritter, await getPref("daemon.storage.flushingIntervalMs"));
  restartStorageT = null;

  // update equivalence with new values
  await writeStats();
}

obrowser.storage.onChanged.addListener(async (changes, areaName) => {
  if ( areaName == "local" ) {
    if ( changes["pref"] !== undefined ) {
      if ( restartStorageT != null ) {
        clearTimeout(restartStorageT);
      }
      restartStorageT = setTimeout(restartStorageF, await getPref("daemon.storage.restartCheckerMsLatency"));
    } else {
      // no changes to preferences
    }
  } else {
    // no used
  }
});

TA_init = async () => {
  if ( await getPref("daemon.runAtStart") ) {
    await handleMessage({action: 'start'});
  }
}

TA_init();