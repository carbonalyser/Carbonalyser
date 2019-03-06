function beforeRequestListener(requestDetails) {
  console.log(requestDetails.url);
}

function headersReceivedListener(requestDetails) {
  let filter = browser.webRequest.filterResponseData(requestDetails.requestId);

  filter.ondata = event => {
    // save unique url, and check if originUrl is one of saved unique url
    console.log(['ondata', requestDetails.url, event.data.byteLength, requestDetails.originUrl]);
    filter.write(event.data);
  };

  filter.onstop = () => {
    filter.disconnect();
  };

  return {};
}

// browser.webRequest.onBeforeRequest.addEventListener(
//     beforeRequestListener,
//     {urls: ["<all_urls>"]}
// );

getCurrentTab = (tabs) => {
  for (let tab of tabs) {
    return tab;
  }
}

handleMessage = (request, sender, sendResponse) => {
  if ('start' === request.action) {
    browser.webRequest.onHeadersReceived.addListener(
      headersReceivedListener,
      {urls: ["<all_urls>"]},
      ["blocking", "responseHeaders"]
    );

    browser.tabs.query({currentWindow: true, active: true}).then(
      (tabs) => {
        const currentTab = getCurrentTab(tabs);
        console.log(currentTab.url);

        browser.tabs.reload({bypassCache: true}).then(
          () => {
            console.log('reloaded');
            //browser.webRequest.onHeadersReceived.removeListener(headersReceivedListener);
            sendResponse({response: "Finished !"});
          },
          (error) => console.error(error)
        );
      },
      (error) => console.error(`Error: ${error}`)
    );
  }
}

browser.runtime.onMessage.addListener(handleMessage);
