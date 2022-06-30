/**
 * Ensure periodic download functionnality.
 */

let periodicDownloadT = null;
let lastDownloaded = null;
doPeriodicDownload = async (type,filename,format,filter) => {
    const rawdata = await getOrCreateRawData();
    return (await compileAndDownload(rawdata,type,filename,format,filter));
}

startPeriodicIfNeeded = async () => {
    const enabled = await getPref("general.export.autoDownload.enabled");
    if ( enabled ) {
        const interval = await getPref("general.export.autoDownload.interval");
        const filter = await getPref("general.export.autoDownload.filter");
        const format = await getPref("general.export.autoDownload.format");
        const filename = await getPref("general.export.autoDownload.filename");
        const type = await getPref("general.export.autoDownload.type");
        lastDownloaded = (await doPeriodicDownload(type,filename,format,filter));
        periodicDownloadT = setInterval(async () => {
            if ( lastDownloaded !== null && lastDownloaded !== undefined ) {
                await obrowser.downloads.erase({
                    id: lastDownloaded
                });
            }
            lastDownloaded = (await doPeriodicDownload(type,filename,format,filter))
        }, interval);
    }
}

obrowser.storage.onChanged.addListener(async (changes, areaName) => {
    if ( areaName == "local" ) {
        if ( changes["pref"] !== undefined ) {
            if ( periodicDownloadT != null ) {
                clearInterval(periodicDownloadT);
            }
            startPeriodicIfNeeded();
        } else {
        // no changes to preferences
        }
    } else {
        // no used
    }
});

startPeriodicIfNeeded();