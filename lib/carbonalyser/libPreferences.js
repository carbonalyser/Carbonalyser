
let preferences = null;
/**
 * Retrieve of create a new preferences object with default values.
 */
getOrCreatePreferences = async () => {
    if ( preferences === null || preferences === undefined ) {
        console.warn("write preferences to storage");
        preferences = {
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
            debug: false                      // enable debug log
        }
        obrowser.storage.local.set({pref: JSON.stringify(preferences)});
    }
    return preferences;
}

/**
 * Retrieve preference from the storage by its qualified name.<br />
 * null is returned if the preference is defined but the value is not set.<br />
 * (so we have to choose the default value instead).<br />
 * @return request value or undefined if the preference is not registered.
 */
getPref = async (name) => {
    const prefs = await getOrCreatePreferences();
    let o = prefs;
    for(const n of name.split(".")) {
        o = o[n];
        if ( o === undefined ) {
            console.warn("pref " + name + " is not in the storage");
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

    printDebug("pref has been written new value ", v);
    await obrowser.storage.local.set({pref: v});
}

/**
 * Inject preference table into html.
 */
injectPreferencesIntoHTML = async (divID) => {
    const storage = await obrowser.storage.local.get("pref");
    if ( storage === undefined ) {
        return;
    } else {
        const prefs = JSON.parse(storage.pref);
        const table = document.getElementById(divID);
        IPIrecurse(table, prefs, undefined);
    }
}

/**
 * PRIVATE
 * Create entry into prefenrence table.
 */
createEntry = function (table, name, value) {
    const row = document.createElement("tr");
    const prefnameTD = document.createElement("td");
    prefnameTD.textContent = name;
    row.append(prefnameTD);
    const prefchanger = document.createElement("td");
    const prefchangerTextA = document.createElement("input");
    prefchangerTextA.setAttribute("type", "text");
    prefchangerTextA.value = typeof(value)==="string" ? value : JSON.stringify(value);
    prefchanger.appendChild(prefchangerTextA);
    row.append(prefchanger);
    row.style.textAlign = "center";
    row.style.verticalAlign = "middle";
    table.append(row);
}

/**
 * PRIVATE
 * Recurse in preference tree and create entries in the table.
 */
IPIrecurse = (table, obj, name) => {
    if( typeof(obj) === "object" ) {
        for(const k of Object.keys(obj)) {
            IPIrecurse(table, obj[k], name === undefined ? k : name + "." + k);
        }
    } else {
        createEntry(table, name, obj);
    }
}
/**
 * PRIVATE
 * Recurse and put right value in the tree.
 * Assuming tree is initially loaded in variable obj.
 */
IPIPrecurse = (obj, name, value) => {
    const i = name.indexOf(".");
    if ( i == -1 ) {
        obj[name] = value;
    } else {
        const key = name.substr(0, i);
        const remain = name.substr(i+1, Infinity);
        IPIPrecurse(obj[key], remain, value);
    }
}


obrowser.storage.onChanged.addListener(async (changes, areaName) => {
    if ( areaName == "local" ) {
        if ( changes["pref"] !== undefined ) {
            preferences = JSON.parse((await obrowser.storage.local.get("pref")).pref);
            if ( preferences === undefined ) {
                preferences = await getOrCreatePreferences();
            }
        }
    }
});
