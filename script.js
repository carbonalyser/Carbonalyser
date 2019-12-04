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
     const origin = extractHostname(!requestDetails.initiator ? (!requestDetails.originUrl ? requestDetails.url : requestDetails.originUrl) : requestDetails.initiator);
     const rhf = requestDetails.responseHeaders.find(element => element.name.toLowerCase() === "content-length");
     const rh = undefined === rhf ? {value: 0} 
      : rhf;
     const requestSize = new Number(rh.value); 
     setByteLengthPerOrigin(origin, requestSize);

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
