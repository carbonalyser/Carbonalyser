
/**
 * Retrieve of create a new preferences object with default values.
 */
getOrCreatePreferences = () => {
    const rawStorage = localStorage.getItem("pref");
    if ( rawStorage !== null ) {
        return JSON.parse(rawStorage);
    } else {
        let storage = {
            daemon: {
                changes: {
                    auto_refresh: true,      // auto refresh
                    msBetweenChanges: 500,   // refresh ms
                    loopMs: 200              // daemon refresh speed
                },
                downloads: {
                    loopMs: 1000             // daemon download refresh speed
                }
            },
            analysis: {
                selectedRegion: null,        // selected region
                carbonIntensity: {
                    refreshMs: 3600 * 1000   // refresh carbon interval
                }
            },
            tab: {
                update: {
                    minMs:  1000             // min ms between two data update
                },
                animate: true                // remove animation
            }
        }
        localStorage.setItem("pref", JSON.stringify(storage));
        return storage;
    }
}

/**
 * Retrieve preference from the storage by its qualified name.
 */
getPref = (name) => {
    let o = getOrCreatePreferences();
    for(const n of name.split(".")) {
        o = o[n];
    }
    return o;
}