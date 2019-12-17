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

isChromeExtension = () => {
  return (typeof(browser) === 'undefined');
}

headersReceivedListener = (requestDetails) => {
  if(isChromeExtension()){
     const origin = extractHostname(!requestDetails.initiator ? requestDetails.url : requestDetails.initiator);
     const responseHeadersContentLength = requestDetails.responseHeaders.find(element => element.name.toLowerCase() === "content-length");
     const contentLength = undefined === responseHeadersContentLength ? {value: 0} 
      : responseHeadersContentLength;
     const requestSize = new Number(contentLength.value); 
     setByteLengthPerOrigin(origin, requestSize);
  }
  else {
    let filter = browser.webRequest.filterResponseData(requestDetails.requestId);

    filter.ondata = event => {
      const origin = extractHostname(!requestDetails.originUrl ? requestDetails.url : requestDetails.originUrl);
      setByteLengthPerOrigin(origin, event.data.byteLength);

      filter.write(event.data);
    };

    filter.onstop = () => {
      filter.disconnect();
    };
  }
  return {};
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
