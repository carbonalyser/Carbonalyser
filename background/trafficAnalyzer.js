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
  setTimeout(downloadCompletedCheckLoop, await getPref("daemon.downloads.latencyBetweenChecksMs"), object);
}

const BYTES_TCP_HEADER = 20;
const BYTES_IP_HEADER  = 20;
// Headers line are always terminated by CRLF cf https://stackoverflow.com/questions/5757290/http-header-line-break-style
const BYTES_HTTP_END   = 2;

getOriginUrlFromRequestDetail = (requestDetails) => {
  let result = null;
  if ( isFirefox() ) {
    result = !requestDetails.originUrl ? requestDetails.url : requestDetails.originUrl;
  } else if (isChrome()) {
    result = !requestDetails.initiator ? requestDetails.url : requestDetails.initiator;
  }
  return result;
}
/**
 * Get origin from request details.
 * Or null if browser is un supported.
 */
getOriginFromRequestDetail = (requestDetails) => {
  return extractHostname(getOriginUrlFromRequestDetail(requestDetails));
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
  Object.assign(stats, createStatsFromData(rawdata));

  // electricity & electricity in attention time
  Object.assign(stats, await generateElectricityConsumptionFromBytes(stats.bytesDataCenterObjectForm, stats.bytesNetworkObjectForm, duration));

  // update electricity of duration parts
  await updateDurationElectricity(duration);

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
    let originData = buffer.rawdata[origin];
    if ( originData === undefined ) {
      originData = createEmptyRawData();
    }
    originData.datacenter.total += requestSize;
    originData.network.total += bnet;
  }
};

const processing = {};
// Take amount of data sent by the client in headers
sendHeadersListener = async (requestDetails) => {
  const now = Date.now();
  lastTimeTrafficSeen = now;
  const origin = getOriginFromRequestDetail(requestDetails);
  const originUrl = getOriginUrlFromRequestDetail(requestDetails);
  const currentProcessing = processing[originUrl];
  if ( currentProcessing !== true ) {
    processing[originUrl] = true;
  }
  if ( /^127\.[0-9]+\.[0-9]+\.[0-9]+$/.test(origin) || /^moz-extension:\/\//.test(originUrl) || "ecoindex.p.rapidapi.com" === origin ) {
    // nothing todo
  } else {
    const bnet = getBytesFromHeaders(requestDetails.requestHeaders);
    if ( buffer.rawdata[origin] === undefined ) {
      buffer.rawdata[origin] = createEmptyRawData();
      buffer.rawdata[origin].network.total = bnet;
    } else {
      buffer.rawdata[origin].network.total += bnet;
    }

    const INVALID = -1; // just to ensure that in case of error, no more requests are sendt
    const deltaMs = 10000; // 10s
    let currentEcoIndex = buffer.rawdata[origin].ecoindex[originUrl];
    let shouldIFetch = !(currentProcessing === true);
    if ( currentEcoIndex === undefined ) {
      currentEcoIndex = {};
    } else {
      for(let k in currentEcoIndex) {
        if ( (now - k) < deltaMs ) {
          shouldIFetch = false;
          break;
        }
      }
    }
    if ( shouldIFetch ) {
      try {
        const xhr = new XMLHttpRequest();
        let A = "da26fd" + 4, B = 8 + "bfmsh75fb" + (2 * 40), C = 368 + "b6c91fp", D = 12 + "c445jsnb", E = 29 + "f495", F = "c321a";
        B = B.replaceAll("8", "6");
        xhr.open("POST", "https://ecoindex.p.rapidapi.com/v1/ecoindexes", false);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("X-RapidAPI-Host", "ecoindex.p.rapidapi.com");
        xhr.setRequestHeader("X-RapidAPI-Key", A + B + C + D + E + F);
        xhr.send(JSON.stringify({
          "height": 1960,
          "url": originUrl,
          "width": 1820
        }));
        if ( xhr.response === 200 ) {
          const result = JSON.parse(xhr.responseText);
          currentEcoIndex[now] = result.score;
          buffer.rawdata[origin].ecoindex[originUrl] = currentEcoIndex;
          console.warn("now=" + now + "originUrl=" + originUrl + " currentEcoIndex=" + currentEcoIndex + " result.score=" + result.score);
        } else {
          currentEcoIndex[now] = INVALID;
          buffer.rawdata[origin].ecoindex[originUrl] = currentEcoIndex;
          throw "";
        }
      } catch(e) {
        console.warn("Cannot get ecoindex for " + originUrl);
      }
      processing[originUrl] = undefined;
    } else {
      printDebug(originUrl + " ecoindex do not need to be fetched");
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