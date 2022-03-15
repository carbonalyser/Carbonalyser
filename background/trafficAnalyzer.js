// last time we got traffic on the wire
let lastTimeTrafficSeen = null;
/**
 * Holds the delay between modification and gui update (set to 0 if you want instant modification).
 */
getMsRefreshGui = async () => {
  return await getPref("daemon.changes.msBetweenChanges");
}
/**
 * At which ms we make the test on the background thread.
 */
getMsCheckRefresh = async () => {
  return await getPref("daemon.changes.loopMs");
}

/**
 * This is trigger when a download start.
 * Since the we can grab only the download start, we have to check manually for its completion.
 */
downloadCompletedCheckLoop = async (object) => {
  lastTimeTrafficSeen = Date.now();
  for(downloadItem of (await getBrowser().downloads.search({id: object.id}))) {
    if ( downloadItem.state == "complete" ) {
      const origin = extractHostname(!downloadItem.referrer ? downloadItem.url : downloadItem.referrer);
      await incBytesDataCenter(origin, downloadItem.bytesReceived);
      await incBytesNetwork(origin, BYTES_TCP_HEADER + BYTES_IP_HEADER);
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

// This is triggered when some headers are received.
headersReceivedListener = async (requestDetails) => {
  lastTimeTrafficSeen = Date.now();
  const origin = getOriginFromRequestDetail(requestDetails);
  // Extract bytes from datacenters
  const responseHeadersContentLength = requestDetails.responseHeaders.find(element => element.name.toLowerCase() === "content-length");
  const contentLength = undefined === responseHeadersContentLength ? {value: 0}
   : responseHeadersContentLength;
  const requestSize = parseInt(contentLength.value, 10);
  await incBytesDataCenter(origin, requestSize);

  // Extract bytes from the network
  await incBytesNetwork(origin, getBytesFromHeaders(requestDetails.responseHeaders));

  return {};
};

// Take amount of data sent by the client in headers
sendHeadersListener = async (requestDetails) => {
  lastTimeTrafficSeen = Date.now();
  const origin = getOriginFromRequestDetail(requestDetails);
  await incBytesNetwork(origin, getBytesFromHeaders(requestDetails.requestHeaders));
}

setBrowserIcon = (type) => {
  getBrowser().browserAction.setIcon({path: `icons/icon-${type}-48.png`});
};

addOneMinute = async () => {
  let o = await getBrowser().storage.local.get('duration');
  let duration = undefined === o.duration ? 1 : 1 * o.duration + 1;
  await getBrowser().storage.local.set({duration: duration});
};

let addOneMinuteInterval;
let currentState = '';

handleMessage = async (request) => {
  if ( await isInDebug() ) {
    console.info("request: {action: " + request.action + ", currentState: " + currentState + "}");
  }
  if ( request.action === currentState ) {
    // event duplicate emission
    if ( await isInDebug() ) {
      console.warn("event duplicate");
    }
    return;
  }
  switch(request.action) {
    case 'start':
      setBrowserIcon('on');

      getBrowser().webRequest.onHeadersReceived.addListener(
        headersReceivedListener,
        {urls: ['<all_urls>']},
        ['responseHeaders']
      );

      getBrowser().webRequest.onSendHeaders.addListener(
        sendHeadersListener,
        {urls: ['<all_urls>']},
        ['requestHeaders']
      );

      await getBrowser().downloads.onCreated.addListener(downloadCompletedCheckLoop);

      if (!addOneMinuteInterval) {
        addOneMinuteInterval = setInterval(addOneMinute, 60000);
      }
      break;
    case 'stop':
      setBrowserIcon('off');
      getBrowser().webRequest.onHeadersReceived.removeListener(headersReceivedListener);
      getBrowser().webRequest.onSendHeaders.removeListener(sendHeadersListener);
      getBrowser().downloads.onCreated.removeListener(downloadCompletedCheckLoop);
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
      console.error("Unknow order :", request);
  }
  currentState = request.action;
};

getBrowser().runtime.onMessage.addListener(handleMessage);

// Synchronize guis with reality
synchronizeGui = async () => {
  if ( lastTimeTrafficSeen == null ) {
    // no traffic before
    if ( await isInDebug() ) {
      console.warn("no traffic before");
    }
  } else {
    const now = Date.now();
    if ( (await getMsRefreshGui()) < (now - lastTimeTrafficSeen) ) {
      // need to do gui refresh
      getBrowser().runtime.sendMessage({ action: 'view-refresh' });
      lastTimeTrafficSeen = null;
      if ( await isInDebug() ) {
        console.warn("need to do gui refresh");
      }
    } else {
      // nothing to do
      if ( await isInDebug() ) {
        console.warn("nothing to do");
      }
    }
  }
}

let synchronizeThread = null;
getMsCheckRefresh().then((value) => {
  synchronizeThread = setInterval(synchronizeGui,value);
});

getBrowser().storage.onChanged.addListener(async (changes, areaName) => {
  //console.error("storage change : " , changes, areaName);
  if ( areaName == "local" ) {
    if ( changes["pref"] !== undefined ) {
      clearInterval(synchronizeThread);
      const auto_refresh = await getPref("daemon.changes.auto_refresh");
      if ( auto_refresh ) {
        synchronizeThread = setInterval(synchronizeGui, await getMsCheckRefresh());
      }
      getBrowser().runtime.sendMessage({ action: 'view-refresh' });
    } else {
      // no changes to preferences
    }
  } else {
    // no used
  }
});
