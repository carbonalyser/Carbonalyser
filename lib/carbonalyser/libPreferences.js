
/**
 * Retrieve of create a new preferences object with default values.
 */
getOrCreatePreferences = async () => {
    const o = await getBrowser().storage.local.get("pref");
    if ( o !== undefined && o.pref !== undefined ) {
        return JSON.parse(o.pref);
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
                selectedRegion: 'default',   // selected region
                carbonIntensity: {
                    refreshMs: 3600 * 1000   // refresh carbon interval
                }
            },
            tab: {
                update: {
                    minMs:  1000             // min ms between two data update
                },
                animate: true                // remove animation
            },
            debug: true                      // enable debug log
        }
        const content = JSON.stringify(storage);
        await getBrowser().storage.local.set({pref: content});
        return storage;
    }
}

/**
 * Retrieve preference from the storage by its qualified name.<br />
 * null is returned if the preference is defined but the value is not set.<br />
 * (so we have to choose the default value instead).<br />
 * @return request value or undefined if the preference is not registered.
 */
getPref = async (name) => {
    let o = await getOrCreatePreferences();
    for(const n of name.split(".")) {
        o = o[n];
        if ( o === undefined ) {
            return undefined;
        }
    }
    return o;
}

/**
 * set preference in the storage.
 */
setPref = async (name, value) => {
    const prefs = await getOrCreatePreferences();
    let o = prefs;
    const parts = name.split(".");
    for(let i = 0; i < parts.length; i = i + 1) {
        if ( (i+1) == parts.length ) {
            o[parts[i]] = value;
        }
        o = o[parts[i]];
    }
    const v = JSON.stringify(prefs);

    if ( await isInDebug() ) {
        console.info("pref has been written new value ", v);
    }
    await getBrowser().storage.local.set({pref: v});
}