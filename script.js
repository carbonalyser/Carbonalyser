extractHostname = (url) => {
  let hostname = url.indexOf("//") > -1 ? url.split('/')[2] : url.split('/')[0];

  // find & remove port number
  hostname = hostname.split(':')[0];
  // find & remove "?"
  hostname = hostname.split('?')[0];

  return hostname;
};

function getOrCreateStats() {
  const stats = localStorage.getItem('stats');
  const statsJson = null === stats ? {bytesDataCenter: {}, bytesNetwork: {}} : JSON.parse(stats);
  return statsJson;
}

incBytesDataCenterLengthPerOrigin = (origin, byteLength) => {
  const statsJson = getOrCreateStats();
  const bytePerOrigin = undefined === statsJson.bytesDataCenter[origin] ? 0 : parseInt(statsJson.bytesDataCenter[origin]);
  statsJson.bytesDataCenter[origin] = bytePerOrigin + byteLength;
  localStorage.setItem('stats', JSON.stringify(statsJson));
};

incBytesNetworkLengthPerOrigin = (origin, bytes) => {
  const statsJson = getOrCreateStats();
  const bytePerOrigin = undefined === statsJson.bytesNetwork[origin] ? 0 : parseInt(statsJson.bytesNetwork[origin]);
  statsJson.bytesNetwork[origin] = bytePerOrigin + bytes;
  localStorage.setItem('stats', JSON.stringify(statsJson));
}

isChrome = () => {
  return (typeof(browser) === 'undefined');
};

// Firefox 1.0+ - detect Gecko engine
isFirefox = () => {
  return (typeof InstallTrigger !== 'undefined');
};

downloadCompletedCheckLoop = async function (object) {
  for(downloadItem of (await browser.downloads.search({id: object.id}))) {
    if ( downloadItem.state == "complete" ) {
      const origin = extractHostname(!downloadItem.referrer ? downloadItem.url : downloadItem.referrer);
      incBytesDataCenterLengthPerOrigin(origin, downloadItem.bytesReceived);
      incBytesNetworkLengthPerOrigin(origin, 20 + 20);
      return;
    }
  }
  setTimeout(downloadCompletedCheckLoop, 1000, object);
}

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
  incBytesDataCenterLengthPerOrigin(origin, requestSize);

  // Extract bytes from the network
  let lengthNetwork = 20 + 20;
  for(var a = 0; a < requestDetails.responseHeaders.length; a = a +1) {
    var obj = requestDetails.responseHeaders[a];
    lengthNetwork += (obj.name + ": " + obj.value).length;
  }
  incBytesNetworkLengthPerOrigin(origin, lengthNetwork);

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
