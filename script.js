extractHostname = (url) => {
  let hostname = url.indexOf("//") > -1 ? url.split('/')[2] : url.split('/')[0];

  // find & remove port number
  hostname = hostname.split(':')[0];
  // find & remove "?"
  hostname = hostname.split('?')[0];

  return hostname;
};

// retrieve or create a stats object.
getOrCreateStats = () => {
  const stats = localStorage.getItem('stats');
  const statsJson = null === stats ? {bytesDataCenter: {}, bytesNetwork: {}} : JSON.parse(stats);
  return statsJson;
}

// increment some stat in the stats storage.
incBytesPerOrigin = (classType, origin, bytes) => {
  const statsJson = getOrCreateStats();
  const bytePerOrigin = undefined === statsJson[classType][origin] ? 0 : parseInt(statsJson[classType][origin]);
  statsJson[classType][origin] = bytePerOrigin + bytes;
  localStorage.setItem('stats', JSON.stringify(statsJson));
}

// increment the amount of bytes classified as stored in datacenter in the stats storage.
incBytesDataCenter = (origin, bytes) => {
  incBytesPerOrigin("bytesDataCenter", origin, bytes);
}

// increment the amount of bytes classified as coming over network in the stats storage.
incBytesNetwork = (origin, bytes) => {
  incBytesPerOrigin("bytesNetwork", origin, bytes);
}

isChrome = () => {
  return (typeof(browser) === 'undefined');
};

// Firefox 1.0+ - detect Gecko engine
isFirefox = () => {
  return (typeof InstallTrigger !== 'undefined');
};

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

// This is triggered when some headers are received.
headersReceivedListener = (requestDetails) => {
  let origin;
  if ( isFirefox() ) {
      origin = extractHostname(!requestDetails.originUrl ? requestDetails.url : requestDetails.originUrl);
  } else if (isChrome()) {
      origin = extractHostname(!requestDetails.initiator ? requestDetails.url : requestDetails.initiator);
  } else {
      console.error("Your browser is not supported sorry ...");
  }

  // Extract bytes from datacenters
  const responseHeadersContentLength = requestDetails.responseHeaders.find(element => element.name.toLowerCase() === "content-length");
  const contentLength = undefined === responseHeadersContentLength ? {value: 0}
   : responseHeadersContentLength;
  const requestSize = parseInt(contentLength.value, 10);
  incBytesDataCenter(origin, requestSize);

  // Extract bytes from the network
  // Exact definition of HTTP headers is here : https://developer.mozilla.org/fr/docs/Web/HTTP/Headers
  let lengthNetwork = BYTES_TCP_HEADER + BYTES_IP_HEADER;
  for(let a = 0; a < requestDetails.responseHeaders.length; a ++) {
    const responseHeader = requestDetails.responseHeaders[a];
    lengthNetwork += (responseHeader.name + ": " + responseHeader.value).length + BYTES_HTTP_END;
  }
  incBytesNetwork(origin, lengthNetwork);

  return {};
};

setBrowserIcon = (type) => {
  chrome.browserAction.setIcon({path: `icons/icon-${type}-48.png`});
};

addOneMinute = () => {
  let duration = localStorage.getItem('duration');
  duration = null === duration ? 1 : 1 * duration + 1;
  localStorage.setItem('duration', duration);
};

let addOneMinuteInterval;

handleMessage = (request) => {
  if ('start' === request.action) {
    setBrowserIcon('on');

    chrome.webRequest.onHeadersReceived.addListener(
      headersReceivedListener,
      {urls: ['<all_urls>']},
      ['responseHeaders']
    );

    browser.downloads.onCreated.addListener(downloadCompletedCheckLoop);

    if (!addOneMinuteInterval) {
      addOneMinuteInterval = setInterval(addOneMinute, 60000);
    }

    return;
  }

  if ('stop' === request.action) {
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
