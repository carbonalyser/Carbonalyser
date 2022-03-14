
/**
 * Retrieve of create a new preferences object with default values.
 */
getOrCreatePreferences = async () => {
    const rawStorage = await browser().storage.local.get("pref");
    if ( rawStorage !== undefined ) {
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
        //const prom = await browser().storage.local.set({pref: content});
       // console.info(pro);
        function successCallback(résultat) {
            console.log("L'opération a réussi avec le message : " + résultat);
          }
          
          
          function failureCallback(erreur) {
            console.error("L'opération a échoué avec le message : " + erreur);
          }
          browser().storage.local.set({pref: content}).then(successCallback, failureCallback);
        return storage;
    }
}

/**
 * Retrieve preference from the storage by its qualified name.
 */
getPref = async (name) => {
    let o = await getOrCreatePreferences();
    for(const n of name.split(".")) {
        o = o[n];
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
    console.warn("new value: ", v);
    console.trace();
    await browser().storage.local.set({pref: v});
}