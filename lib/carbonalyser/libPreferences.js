
printDebug = (msg) => {
    printDebugOrigin("libPreferences : " + msg);
}
let preferences = null;
/**
 * Retrieve of create a new preferences object with default values.<br />
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
                    runAtStart: {value: false, description: "wheter we should run analysis at browser start."},
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
                    settings: {
                        preferencesScreen: {
                            msBeforeStopEdit: {value: 10000, description: "Delay (ms) after which we consider user has finished editing."}
                        }
                    },
                    update: {
                        auto_refresh: {value: true, description: "auto refresh"},
                        resize_delay: {value: 500, description: "apply delay to the chart resize (ms)"}
                    },
                    animate: {value: true, description: "remove animation"},
                    min_attention_time: {value: (500), description: "threshold for attention time do not show anything below that (in ms)"}
                },
                popup: {
                    update: {
                        auto_refresh: {value: true, description: "auto refresh"},
                    }
                },
                general: {
                    update: {
                        storageFetchMs: {value: 1000, description: "latency induced for storage fetch by guis (ms)"},
                    },                        
                    electricityUnit: {value: "Wh", description: "unit for electricity (mWh, Wh, kWh)"},
                    kWhPerByteDataCenter: {value: 0.000000000072, description: "Factor to apply when converting bytes to electricity (In kWh per byte)."},
                    kWhPerByteNetwork: {value: 0.000000000152, description: "Factor to apply when converting bytes to electricity (In kWh per byte)."},
                    kWhPerMinuteDevice: {value: 0.00021, description: ""},
                    GESgCO2ForOneKmByCar: {value: 220, description: ""},
                    GESgCO2ForOneChargedSmartphone: {value: 8.3, description: ""},
                    BulbConsumptionW: {value: 20, description: ""}
                },
                debug: {value: false, description: "enable debug log"},
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
 * set preference in the storage.<br />
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
 * Inject preference table into html.<br />
 */
injectPreferencesIntoHTML = async (divID) => {
    const prefs = await getPref(null);
    const table = document.getElementById(divID);
    IPIrecurse(table, prefs, undefined);
}

let editing = false;
let editingTMO = null;

/**
 * PRIVATE<br />
 * Create or update entry into preference table.<br />
 */
ensureEntry = function (table, name, obj) {
    const value = typeof(obj.value)==="string" ? obj.value : JSON.stringify(obj.value);
    let foundInPrefTable = false;
    for(const child of table.children) {
        if ( child.children[0].textContent === name ) {
            foundInPrefTable = true;
            const input = child.children[1].children[0];
            input.value = value;
        }
    }
    if ( foundInPrefTable ) { 
        // nothing to do
    } else {
        const row = document.createElement("tr");
        const prefnameTD = document.createElement("td");
        prefnameTD.textContent = name;
        row.append(prefnameTD);
        const prefchanger = document.createElement("td");
        const prefchangerTextA = document.createElement("input");
        prefchangerTextA.addEventListener('focusin', (event) => {
            editing = true;
        }, true);
        prefchangerTextA.addEventListener('focusout', async (event) => {
            if ( editingTMO != null ) {
                clearTimeout(editingTMO);
            }
            editingTMO = setTimeout(() => {
                editing = false;
                editingTMO = null;
            }, await getPref("tab.settings.preferencesScreen.msBeforeStopEdit"));
        }, true);
        prefchangerTextA.setAttribute("type", "text");
        prefchangerTextA.value = value;
        prefchanger.appendChild(prefchangerTextA);
        row.append(prefchanger);
        const prefDescription = document.createElement("td");
        prefDescription.textContent = translate("tab_settings_preferencesScreen_prefs_" + name.replaceAll(".", "_"));
        row.append(prefDescription);
        row.style.textAlign = "center";
        row.style.verticalAlign = "middle";
        table.append(row);
    }
}

/**
 * PRIVATE<br />
 * Recurse in preference tree and create entries in the table.<br />
 */
IPIrecurse = (table, obj, name) => {
    if ( editing ) {
        return;
    } else {
        if ( typeof(obj) === "object" ) {
            if ( obj.value !== undefined && obj.description !== undefined ) {
                ensureEntry(table, name, obj);
            } else {
                for(const k of Object.keys(obj)) {
                    IPIrecurse(table, obj[k], name === undefined ? k : name + "." + k);
                }
            }
        }
    }
}

/**
 * PRIVATE<br />
 * Recurse and put right value in the tree.<br />
 * Assuming tree is initially loaded in variable obj.<br />
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

/**
 * Based on mWh convert electricity.
 */
getElectricityModifier = async () => {
    const unitIndex = {mWh: 1, Wh: 0.001, kWh: 0.000001};
    return unitIndex[await getPref("general.electricityUnit")];
}

listenerStorage = async (changes, areaName) => {
    if ( areaName == "local" ) {
        if ( changes["pref"] !== undefined ) {
            preferences = null;
            preferences = await getPref(null);
        }
    }
}

LP_init = () => {
    obrowser.storage.onChanged.addListener(listenerStorage);
}

LP_end = () => {
    obrowser.storage.onChanged.removeListener(listenerStorage);
}

LP_init();