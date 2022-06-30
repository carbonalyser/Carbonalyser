
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
                    fetchCurrentLocation: {value: true, description: "should we attempt to fetch user location with 3rd party service, the value is reset to false when manual region selection have been done."},
                    storage: {
                        flushingIntervalMs: {value: 5000, description: "interval (ms) at which we write the storage"},
                        restartCheckerMsLatency: {value: 100, description: "latency that apply when preferences have been changed"},
                    },
                    downloads: {
                        latencyBetweenChecksMs: {value: 1000, description: "interval at which we check for download end (ms)."},
                    },
                    ecoindex: {
                        enabled: {value: false, description: "fetch ecoindex for each visited url"},
                        intervalMs: {value: 60*24*3600000, description: "interval at which to fetch new ecoindex"}
                    }
                },
                analysis: {
                    selectedRegion: {value: undefined, description: "selected region"},
                    carbonIntensity: {
                        refreshMs: {value: 3600 * 1000, description: "refresh carbon interval"},
                    }
                },
                tab: {
                    forecast: {
                        compareYear: {
                            value: {value: 2022, description: "compare year"},
                            electricity: {
                                total: {
                                    TWh: {value: 22000, description: "compare year tera watt"},
                                },
                                teck: {
                                    percent: {value: 0.1, description: "percent of new teck"},
                                }
                            }
                        }
                    },
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
                    population: {
                        number: {value: 8e9, description: "holds number of people on earth"},
                        internetPercent: {value: 0.55, description: "holds percent of population with internet"},
                    },
                    kWhPerByteDataCenter: {value: 7.2e-11, description: "Factor to apply when converting bytes to electricity (In kWh per byte)."},
                    kWhPerByteNetwork: {value: 1.52e-10, description: "Factor to apply when converting bytes to electricity (In kWh per byte)."},
                    DeviceConsumptionW: {value: 50, description: ""},
                    GESgCO2ForOneKmByCar: {value: 220, description: ""},
                    GESgCO2ForOneChargedSmartphone: {value: 8.3, description: ""},
                    BulbConsumptionW: {value: 20, description: ""},
                    equivalence: {
                        cigarette: {value: 14, description: "holds gCO² per cigarette"},
                        smartphone: {
                            capacityWh: {value: 20, description: "holds how much power to charge one smartphone (Wh)"}
                        }
                    },
                    export: {
                        autoDownload: {
                            enabled: {value: false, description: "is auto download enabled"},
                            filename: {value: "carbonalyser_download", description: "filename into which to download the data"},
                            format: {value: "csv", description: "format into which to download the data"},
                            filter: {value: null, description: "filter to apply to the data"},
                            interval: {value: 3600000, description: "interval at which to download the data (in ms)"},
                            type: {value: "data", description: "type of data to download: {data,co2,electricity}"}
                        }
                    }
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

LP_init = async () => {
    obrowser.storage.onChanged.addListener(listenerStorage);
}

LP_end = () => {
    obrowser.storage.onChanged.removeListener(listenerStorage);
}

LP_init();