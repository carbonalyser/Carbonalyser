/**
 * Update user attention (in ms).
 */

let currentOrigin = null;
let currentStart = null;
let analysisRunning = false;
storageGetAnalysisState().then((value)=>{
    analysisRunning = value
});
updateAttentionTime = async (url) => {
    if ( url === undefined ) {
        console.warn("That case has happened");
    } else {
        const urlOrigin = url;
        const newOrigin = extractHostname(urlOrigin);
        const dn = Date.now();
        console.warn("currentOrigin=" + currentOrigin);
        if ( currentOrigin === null || currentOrigin === undefined ) {
            // nothing to do
        } else {
            const delta = dn - currentStart;
            const rawdata = await getOrCreateRawData();
            if ( rawdata[currentOrigin] === undefined ) {
                rawdata[currentOrigin] = createEmptyRawData();
            }
            rawdata[currentOrigin].attentionTime += delta;
            console.warn("currentOrigin=" + currentOrigin, rawdata);
            await obrowser.storage.local.set({rawdata: JSON.stringify(rawdata)});
        }
        console.warn("newOrigin="+newOrigin);
        currentOrigin = newOrigin;
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
    if ( analysisRunning ) {
        const tab = await obrowser.tabs.get(activeInfo.tabId);
        await updateAttentionTime(tab.url);
    }
}

handleTabUpdated = async (tabId, changeInfo, tab) => {
    if ( analysisRunning ) {
        await updateAttentionTime(tab.url);
    }
}

listenerStorage = (changes, areaName) => {
    if ( areaName == "local" ) {
        if ( changes["analysisRunning"] !== undefined ) {
            analysisRunning = changes["analysisRunning"]
        }
    }
}

obrowser.tabs.onUpdated.addListener(handleTabUpdated);
obrowser.tabs.onActivated.addListener(handleTabActivated);
obrowser.storage.onChanged.addListener(listenerStorage);