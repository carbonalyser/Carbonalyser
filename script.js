const extractHostname = (url) => {
  let hostname = url.indexOf("//") > -1 ? url.split('/')[2] : url.split('/')[0];

  // find & remove port number
  hostname = hostname.split(':')[0];
  // find & remove "?"
  hostname = hostname.split('?')[0];

  return hostname;
}

const setByteLengthPerOrigin = (origin, byteLength) => {
  const stats = localStorage.getItem('stats');
  const statsJson = null === stats ? {} : JSON.parse(stats);

  let bytePerOrigin = undefined === statsJson[origin] ? 0 : parseInt(statsJson[origin]);
  statsJson[origin] = bytePerOrigin + byteLength;

  localStorage.setItem('stats', JSON.stringify(statsJson));
}

const headersReceivedListener = (requestDetails) => {
  // Do not count bytes from requests from local cache
  if (requestDetails.fromCache) return

  const filter = browser.webRequest.filterResponseData(requestDetails.requestId);
  filter.ondata = event => {
    let origin
    // If Incognito request we do not track the domain origin
    if (requestDetails.incognito) {
      origin = 'Incognito'
    } else {
      origin = extractHostname(!requestDetails.originUrl ? requestDetails.url : requestDetails.originUrl);
    }
    setByteLengthPerOrigin(origin, event.data.byteLength);

    filter.write(event.data);
  };

  filter.onstop = () => {
    filter.disconnect();
  };

  return {};
}

const setBrowserIcon = (type) => {
  browser.browserAction.setIcon({path: `icons/icon-${type}-48.png`});
}

const addOneMinute = () => {
  let duration = localStorage.getItem('duration');
  duration = null === duration ? 1 : 1 * duration + 1;
  localStorage.setItem('duration', duration);
}

let addOneMinuteInterval;

const handleMessage = (request, sender, sendResponse) => {
  if ('start' === request.action) {
    setBrowserIcon('on');

    browser.webRequest.onHeadersReceived.addListener(
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
    browser.webRequest.onHeadersReceived.removeListener(headersReceivedListener);

    if (addOneMinuteInterval) {
      clearInterval(addOneMinuteInterval);
      addOneMinuteInterval = null;
    }
  }
}

browser.runtime.onMessage.addListener(handleMessage);
