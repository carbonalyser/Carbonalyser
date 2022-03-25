/**
 * Update user attention (in ms).
 */

let currentOrigin = null;
let currentStart = null;

updateAttentionTime = async (url) => {
    if ( currentOrigin !== null ) {
        const dn = Date.now();
        if ( currentOrigin === url ) {
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
    } else {
        // nothing to do
    }
}

handleTabActivated = async (activeInfo) => {
    const tab = await obrowser.tabs.get(activeInfo.tabId);
    if ( tab.url !== undefined ) {
        updateAttentionTime(tab.url);
    } else {
        // we do it later
    }
}

handleTabUpdated = async (tabId, changeInfo, tab) => {
    if ( tab.url !== undefined ) {
        updateAttentionTime(tab.url);
    }
}

obrowser.tabs.onUpdated.addListener(handleTabUpdated);
obrowser.tabs.onActivated.addListener(handleTabActivated);