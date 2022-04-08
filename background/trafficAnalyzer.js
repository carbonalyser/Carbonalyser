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
 * Generate and write stats to the storage.
 */
writeStats = async (rawdata) => {
  if ( rawdata === undefined ) {
    rawdata = await getOrCreateRawData();
  }
  const stats = getEmptyStatsObject();
  stats.stats = await getStats(undefined, rawdata);
  stats.equivalence = await computeEquivalenceFromStatsItem(stats.stats);

  await obrowser.storage.local.set({rawdata: JSON.stringify(rawdata), stats: JSON.stringify(stats)});
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
  let o = await obrowser.storage.local.get('duration');
  let duration = undefined === o.duration ? 1 : 1 * o.duration + 1;
  await obrowser.storage.local.set({duration: duration});
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