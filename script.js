
// This is trigger when a download start.
// Since the we can grab only the download start, we have to check manually for its completion.
downloadCompletedCheckLoop = async function (object) {
  for(downloadItem of (await browser.downloads.search({id: object.id}))) {
    if ( downloadItem.state == "complete" ) {
      const origin = extractHostname(!downloadItem.referrer ? downloadItem.url : downloadItem.referrer);
      incBytesDataCenter(origin, downloadItem.bytesReceived);
      incBytesNetwork(origin, BYTES_TCP_HEADER + BYTES_IP_HEADER);
      return;
    }
  }
  setTimeout(downloadCompletedCheckLoop, 1000, object);
}

const BYTES_TCP_HEADER = 20;
const BYTES_IP_HEADER  = 20;
// Headers line are always terminated by CRLF cf https://stackoverflow.com/questions/5757290/http-header-line-break-style
const BYTES_HTTP_END   = 2;

// Get origin from request details
getOriginFromRequestDetail = (requestDetails) => {
  if ( isFirefox() ) {
    return extractHostname(!requestDetails.originUrl ? requestDetails.url : requestDetails.originUrl);
  } else if (isChrome()) {
    return extractHostname(!requestDetails.initiator ? requestDetails.url : requestDetails.initiator);
  }
  console.error("Your browser is not supported sorry ...");
  return null;
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
  if ('start' === request.action) {
    if ( currentState === request.action ) {
      return;
    }
    currentState = request.action;
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

    return;
  } else if ('stop' === request.action) {
    if ( currentState === request.action ) {
      return;
    }
    currentState = request.action;
    setBrowserIcon('off');
    chrome.webRequest.onHeadersReceived.removeListener(headersReceivedListener);
    chrome.downloads.onCreated.removeListener(downloadCompletedCheckLoop);
    if (addOneMinuteInterval) {
      clearInterval(addOneMinuteInterval);
      addOneMinuteInterval = null;
    }
  }
};

chrome.runtime.onMessage.addListener(handleMessage);
