
const DEBUG = true;

// last time we got traffic on the wire
let lastTimeTrafficSeen = null;
/**
 * Holds the delay between modification and gui update (set to 0 if you want instant modification).
 */
getMsRefreshGui = () => {
  return getPref("daemon.changes.msBetweenChanges");
}
/**
 * At which ms we make the test on the background thread.
 */
getMsCheckRefresh = () => {
  return getPref("daemon.changes.loopMs");
}

/**
 * This is trigger when a download start.
 * Since the we can grab only the download start, we have to check manually for its completion.
 */
downloadCompletedCheckLoop = async (object) => {
  lastTimeTrafficSeen = Date.now();
  for(downloadItem of (await browser.downloads.search({id: object.id}))) {
    if ( downloadItem.state == "complete" ) {
      const origin = extractHostname(!downloadItem.referrer ? downloadItem.url : downloadItem.referrer);
      incBytesDataCenter(origin, downloadItem.bytesReceived);
      incBytesNetwork(origin, BYTES_TCP_HEADER + BYTES_IP_HEADER);
      return;
    }
  }
  setTimeout(downloadCompletedCheckLoop, getPref("daemon.download.loopMs"), object);
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
headersReceivedListener = (requestDetails) => {
  lastTimeTrafficSeen = Date.now();
  const origin = getOriginFromRequestDetail(requestDetails);
  // Extract bytes from datacenters
  const responseHeadersContentLength = requestDetails.responseHeaders.find(element => element.name.toLowerCase() === "content-length");
  const contentLength = undefined === responseHeadersContentLength ? {value: 0}
   : responseHeadersContentLength;
  const requestSize = parseInt(contentLength.value, 10);
  incBytesDataCenter(origin, requestSize);

  // Extract bytes from the network
  incBytesNetwork(origin, getBytesFromHeaders(requestDetails.responseHeaders));

  return {};
};

// Take amount of data sent by the client in headers
sendHeadersListener = (requestDetails) => {
  lastTimeTrafficSeen = Date.now();
  const origin = getOriginFromRequestDetail(requestDetails);
  incBytesNetwork(origin, getBytesFromHeaders(requestDetails.requestHeaders));
}

setBrowserIcon = (type) => {
  chrome.browserAction.setIcon({path: `icons/icon-${type}-48.png`});
};

addOneMinute = () => {
  let duration = localStorage.getItem('duration');
  duration = null === duration ? 1 : 1 * duration + 1;
  localStorage.setItem('duration', duration);
};

let addOneMinuteInterval;
let currentState = '';

handleMessage = (request) => {
  if ( DEBUG ) {
    console.info("request: {action: " + request.action + ", currentState: " + currentState + "}");
  }
  if ( request.action === currentState ) {
    // event duplicate emission
    if ( DEBUG ) {
      console.warn("event duplicate");
    }
    return;
  }
  if ('start' === request.action) {
    setBrowserIcon('on');

    chrome.webRequest.onHeadersReceived.addListener(
      headersReceivedListener,
      {urls: ['<all_urls>']},
      ['responseHeaders']
    );

    chrome.webRequest.onSendHeaders.addListener(
      sendHeadersListener,
      {urls: ['<all_urls>']},
      ['requestHeaders']
    );

    chrome.downloads.onCreated.addListener(downloadCompletedCheckLoop);

    if (!addOneMinuteInterval) {
      addOneMinuteInterval = setInterval(addOneMinute, 60000);
    }

  } else if ('stop' === request.action) {
    setBrowserIcon('off');
    chrome.webRequest.onHeadersReceived.removeListener(headersReceivedListener);
    chrome.webRequest.onSendHeaders.removeListener(sendHeadersListener);
    chrome.downloads.onCreated.removeListener(downloadCompletedCheckLoop);
    if (addOneMinuteInterval) {
      clearInterval(addOneMinuteInterval);
      addOneMinuteInterval = null;
    }
  }
  currentState = request.action;
};

chrome.runtime.onMessage.addListener(handleMessage);

// Synchronize guis with reality
synchronizeGui = () => {
  if ( lastTimeTrafficSeen == null ) {
    // no traffic before
    if ( DEBUG ) {
      console.warn("no traffic before");
    }
  } else {
    const now = Date.now();
    if ( getMsRefreshGui() < (now - lastTimeTrafficSeen) ) {
      // need to do gui refresh
      chrome.runtime.sendMessage({ action: 'view-refresh' });
      lastTimeTrafficSeen = null;
      if ( DEBUG ) {
        console.warn("need to do gui refresh");
      }
    } else {
      // nothing to do
      if ( DEBUG ) {
        console.warn("nothing to do");
      }
    }
  }
}
let synchronizeThread = setInterval(synchronizeGui, getMsCheckRefresh());

browser.storage.onChanged.addListener((changes, areaName) => {
  if ( areaName == "local" ) {
    if ( changes["pref"] !== undefined ) {
      clearInterval(synchronizeThread);
      synchronizeGui = setInterval(synchronizeGui, getMsCheckRefresh());
    } else {
      // no changes to preferences
    }
  } else {
    // no used
  }
});
