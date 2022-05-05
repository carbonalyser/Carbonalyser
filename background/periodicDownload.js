/**
 * Ensure periodic download functionnality.
 */

let periodicDownloadT = null;

doPeriodicDownload = async (type,filename,format,filter) => {
    const rawdata = await getOrCreateRawData();
    await compileAndDownload(rawdata,type,filename,format,filter);
}

startPeriodicIfNeeded = async () => {
    const enabled = await getPref("general.export.autoDownload.enabled");
    if ( enabled ) {
        const interval = await getPref("general.export.autoDownload.interval");
        const filter = await getPref("general.export.autoDownload.filter");
        const format = await getPref("general.export.autoDownload.format");
        const filename = await getPref("general.export.autoDownload.filename");
        const type = await getPref("general.export.autoDownload.type");
        doPeriodicDownload(type,filename,format,filter);
        periodicDownloadT = setInterval(() => {
            doPeriodicDownload(type,filename,format,filter)
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