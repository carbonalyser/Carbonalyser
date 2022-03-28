/**
 * Update user attention (in ms).
 */

let currentOrigin = null;
let currentStart = null;

updateAttentionTime = async (url) => {
    if ( url === undefined ) {
        console.warn("That case has happened");
    } else {
        const urlOrigin = url;
        url = extractHostname(urlOrigin);
        const dn = Date.now();
        if ( currentOrigin === null || currentOrigin === undefined ) {
            // nothing to do
        } else {
            const delta = dn - currentStart;
            const rawdata = await getOrCreateRawData();
            if ( rawdata[currentOrigin] === undefined ) {
                rawdata[currentOrigin] = createEmptyRawData();
            }
            rawdata[currentOrigin].attentionTime += delta;
            await obrowser.storage.local.set({rawdata: JSON.stringify(rawdata)});
        }
        currentOrigin = url;
        currentStart = dn;

        // prevent localhost pages.
        for(const turl of [/^about:.*$/,/^moz-extension:.*$/,/^https?:\/\/localhost\/.*$/]) {
            if ( turl.test(urlOrigin) ) {
                currentOrigin = null;
                currentStart = null;
                break;
            }
        }

        // prevent loopback ranges
        const hostname = extractHostname(urlOrigin);
        if ( /^127\.[0-9]+\.[0-9]+\.[0-9]+$/.test(hostname) ) {
            currentOrigin = null;
            currentStart = null;
        }
    }
}

handleTabActivated = async (activeInfo) => {
    const tab = await obrowser.tabs.get(activeInfo.tabId);
    await updateAttentionTime(tab.url);
}
/*
handleTabUpdated = async (tabId, changeInfo, tab) => {
    await updateAttentionTime(tab.url);
}
*/
//obrowser.tabs.onUpdated.addListener(handleTabUpdated);
obrowser.tabs.onActivated.addListener(handleTabActivated);