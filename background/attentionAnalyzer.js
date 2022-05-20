/**
 * Update user attention (in ms).
 */

let currentOrigin = null;
let currentStart = null;
let analysisRunning = false;
storageGetAnalysisState().then((value)=>{
    analysisRunning = value
});
let stack = [];

updateAttentionTime = async (url) => {
    if ( url === undefined || url === null ) {
        // aborting
    } else {
        const urlOrigin = url;
        let newOrigin = extractHostname(urlOrigin);
        const dn = Date.now();

        // prevent localhost pages.
        if ( isRestricted(urlOrigin) ) {
            newOrigin = null;
        }

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
        currentOrigin = newOrigin;
        currentStart = dn;
    }
}

/**
 * Update attention time in a differed way.
 */
loopUpdateAttentionCheck = async () => {
    const url = stack.pop();
    await updateAttentionTime(url);
    stack = [];
}
setInterval(loopUpdateAttentionCheck, 500);

handleTabActivated = async (activeInfo) => {
    if ( analysisRunning ) {
        const tab = await obrowser.tabs.get(activeInfo.tabId);
        stack.push(tab.url);
    }
}

handleTabUpdated = async (tabId, changeInfo, tab) => {
    if ( tab.active ) {
        if ( analysisRunning ) {
            if( tab.status === "complete" ) {
                stack.push(tab.url);
            }
        }
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