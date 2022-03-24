
printDebug = (msg) => {
    printDebugOrigin("libPreferences : " + msg);
}

let preferences = null;
/**
 * Retrieve of create a new preferences object with default values.
 */
getOrCreatePreferences = async () => {
    if ( preferences === null || preferences === undefined ) {
        const prefText = (await obrowser.storage.local.get("pref")).pref;
        if ( prefText !== undefined ) {
            preferences = JSON.parse(prefText);
            printDebug("getOrCreatePreferences: blocking read");
        } else {
            preferences = {
                daemon: {
                    storage: {
                        flushingIntervalMs: {value: 5000, description: "interval (ms) at which we write the storage"},
                        restartCheckerMsLatency: {value: 100, description: "latency that apply when preferences have been changed"},
                    },
                    downloads: {
                        latencyBetweenChecksMs: {value: 1000, description: "interval at which we check for download end (ms)."},
                    }
                },
                analysis: {
                    selectedRegion: {value: 'default', description: "selected region"},
                    carbonIntensity: {
                        refreshMs: {value: 3600 * 1000, description: "refresh carbon interval"},
                    }
                },
                tab: {
                    update: {
                        auto_refresh: {value: true, description: "auto refresh"},
                    },
                    animate: {value: true, description: "remove animation"},
                },
                popup: {
                    update: {
                        auto_refresh: {value: true, description: "auto refresh"},
                    }
                },
                general: {
                    update: {
                        storageFetchMs: {value: 1000, description: "latency induced for storage fetch by guis (ms)"},
                    }
                },
                debug: {value: true, description: "enable debug log"},
            }
            printDebug("getOrCreatePreferences: blocking read");
            printDebug("getOrCreatePreferences: write preferences to storage");
            printDebug("getOrCreatePreferences: blocking write");
            obrowser.storage.local.set({pref: JSON.stringify(preferences)});
        }
    }
    return preferences;
}

/**
 * Retrieve preference from the storage by its qualified name.<br />
 * null is returned if the preference is defined but the value is not set.<br />
 * (so we have to choose the default value instead).<br />
 * Pass a zero size string causing all object to be retrieved.<br />
 * undefined not allowed.<br />
 * @return request value or undefined if the preference is not registered.
 */
getPref = async (name) => {
    if ( name !== "debug" ) {
        printDebug("getPref: " + name);
    }
    const prefs = await getOrCreatePreferences();
    let o = prefs;
    if ( name === undefined ) {
        throw "Illegal argument exception: " + name;
    } else if ( name === null ) {
        return prefs;
    } else {
        for(const n of name.split(".")) {
            o = o[n];
            if ( o === undefined ) {
                console.warn("pref " + name + " is not in the storage");
                return undefined;
            }
        }
        return o.value;
    }
}

/**
 * set preference in the storage.
 */
setPref = async (name, value) => {
    printDebug("setPref(" + name + "," + JSON.stringify(value) + ");");
    const prefs = await getOrCreatePreferences();
    let o = prefs;
    const parts = name.split(".");
    for(let i = 0; i < parts.length; i = i + 1) {
        if ( (i+1) == parts.length ) {
            o[parts[i]].value = value;
        }
        o = o[parts[i]];
    }
    const v = JSON.stringify(prefs);

    printDebug("pref has been written new value : " + v);
    await obrowser.storage.local.set({pref: v});
}

/**
 * Inject preference table into html.
 */
injectPreferencesIntoHTML = async (divID) => {
    const prefs = await getPref(null);
    const table = document.getElementById(divID);
    IPIrecurse(table, prefs, undefined);
}

/**
 * PRIVATE
 * Create entry into prefenrence table.
 */
createEntry = function (table, name, obj) {
    const row = document.createElement("tr");
    const prefnameTD = document.createElement("td");
    prefnameTD.textContent = name;
    row.append(prefnameTD);
    const prefchanger = document.createElement("td");
    const prefchangerTextA = document.createElement("input");
    prefchangerTextA.setAttribute("type", "text");
    prefchangerTextA.value = typeof(obj.value)==="string" ? obj.value : JSON.stringify(obj.value);
    prefchanger.appendChild(prefchangerTextA);
    row.append(prefchanger);
    const prefDescription = document.createElement("td");
    prefDescription.textContent = translate("tab_settings_preferencesScreen_prefs_" + name.replaceAll(".", "_"));
    row.append(prefDescription);
    row.style.textAlign = "center";
    row.style.verticalAlign = "middle";
    table.append(row);
}

/**
 * PRIVATE
 * Recurse in preference tree and create entries in the table.
 */
IPIrecurse = (table, obj, name) => {
    if ( typeof(obj) === "object" ) {
        if ( obj.value !== undefined && obj.description !== undefined ) {
            createEntry(table, name, obj);
        } else {
            for(const k of Object.keys(obj)) {
                IPIrecurse(table, obj[k], name === undefined ? k : name + "." + k);
            }
        }
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
        obj[name].value = value;
    } else {
        const key = name.substr(0, i);
        const remain = name.substr(i+1, Infinity);
        IPIPrecurse(obj[key], remain, value);
    }
}

listenerStorage = async (changes, areaName) => {
    if ( areaName == "local" ) {
        if ( changes["pref"] !== undefined ) {
            preferences = null;
            preferences = await getPref(null);
        }
    }
}

init = () => {
    obrowser.storage.onChanged.addListener(listenerStorage);
}

end = () => {
    obrowser.storage.onChanged.removeListener(listenerStorage);
}

window.addEventListener("load", init);
window.addEventListener("unload", end);