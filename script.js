extractHostname = (url) => {
  let hostname = url.indexOf("//") > -1 ? url.split('/')[2] : url.split('/')[0];

  // find & remove port number
  hostname = hostname.split(':')[0];
  // find & remove "?"
  hostname = hostname.split('?')[0];

  return hostname;
}

setByteLengthPerOrigin = (origin, byteLength) => {
  const stats = localStorage.getItem('stats');
  const statsJson = null === stats ? {} : JSON.parse(stats);

  let bytePerOrigin = undefined === statsJson[origin] ? 0 : parseInt(statsJson[origin]);
  statsJson[origin] = bytePerOrigin + byteLength;

  localStorage.setItem('stats', JSON.stringify(statsJson));
}

headersReceivedListener = (requestDetails) => {
  const origin = extractHostname(!requestDetails.originUrl ? requestDetails.url : requestDetails.originUrl);
  let byteLength = 0;

  try {
    let filter = chrome.webRequest.filterResponseData(requestDetails.requestId);

    filter.ondata = event => {
      byteLength += event.data.byteLength;
      filter.write(event.data);
    };

    setByteLengthPerOrigin(origin, byteLength);

    filter.onstop = () => {
      filter.disconnect();
    };

    return {};
  } catch (error) {
    requestDetails.responseHeaders.forEach((header) => {
      if (header.name === 'Content-Length') {
        byteLength += header.value;
      }
    });

    setByteLengthPerOrigin(origin, byteLength);
  }
}

setBrowserIcon = (type) => {
  chrome.browserAction.setIcon({path: `icons/icon-${type}-48.png`});
}

addOneMinute = () => {
  let duration = localStorage.getItem('duration');
  duration = null === duration ? 1 : 1 * duration + 1;
  localStorage.setItem('duration', duration);
}

let addOneMinuteInterval;

handleMessage = (request, sender, sendResponse) => {
  if ('start' === request.action) {
    setBrowserIcon('on');

    chrome.webRequest.onHeadersReceived.addListener(
      headersReceivedListener,
      {urls: ["<all_urls>"]},
      ["blocking", "responseHeaders"]
    );

    if (!addOneMinuteInterval) {
      addOneMinuteInterval = setInterval(addOneMinute, 60000);
    }

    return;
  }

  if ('stop' === request.action) {
    setBrowserIcon('off');
    chrome.webRequest.onHeadersReceived.removeListener(headersReceivedListener);

    if (addOneMinuteInterval) {
      clearInterval(addOneMinuteInterval);
      addOneMinuteInterval = null;
    }
  }
}

chrome.runtime.onMessage.addListener(handleMessage);
