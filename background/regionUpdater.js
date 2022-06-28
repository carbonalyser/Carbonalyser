/**
 * Update informations of parts of the world.
 */

const regionsList = {
    // only CO² emission linked to electricity (not natural gases)
    // so resulting should be CO² emission not CO²eq
    regionUnitedKingdom: {
        carbonIntensity: {
            url: "https://api.carbonintensity.org.uk/intensity",
            fetch: function () {
                const xhr = new XMLHttpRequest();
                xhr.open("GET", this.url, false);
                xhr.send();
                if ( xhr.status === 200 ) {
                    return JSON.parse(xhr.responseText).data[0].intensity.actual;
                }
            }
        },
        geometryDescription: getGeometryForCountry('GBR')
    },
    // at 2022 this represents 90% of people
    regionFrance: {
        carbonIntensity: {
            url: "https://opendata.edf.fr/api/records/1.0/search/?dataset=indicateurs-de-performance-extra-financiere&q=&facet=annee&facet=engagements_rse&facet=csr_goals&facet=indicateurs_cles_de_performance&facet=performance_indicators&refine.indicateurs_cles_de_performance=Intensit%C3%A9+carbone%C2%A0%3A+%C3%A9missions+sp%C3%A9cifiques+de+CO2+dues+%C3%A0+la+production+d%E2%80%99%C3%A9lectricit%C3%A9+%E2%88%9A+(gCO2%2FkWh)",
            fetch: function () {
                const xhr = new XMLHttpRequest();
                xhr.open("GET", this.url, false);
                xhr.send();
                if ( xhr.status === 200 ) {               
                    const records = JSON.parse(xhr.responseText).records;
                    let max = null, fieldMax = null;
                    
                    for(let a = 0; a < records.length; a = a + 1) {
                        const field = records[a].fields;
                        if ( max == null || field.annee > max ) {
                            max = field.annee;
                            fieldMax = field;
                        }
                    }
                    if ( fieldMax != null ) {
                        return fieldMax.valeur;
                    }
                    return null;
                }
            },
            default: 80
        },
        geometryDescription: getGeometryForCountry('FRA')
    },
    regionEuropeanUnion: {
        carbonIntensity: {
            // https://app.electricitymap.org/zone/FR 05/05/2022
            default: 276
        },
        geometryDescription: EUObjectUnified.features[0].geometry
    },
    regionUnitedStates: {
        carbonIntensity: {
            default: 493
        },
        geometryDescription: getGeometryForCountry('USA')
    },
    regionChina: {
        carbonIntensity: {
            default: 681
        },
        geometryDescription: getGeometryForCountry('CHN')
    },
    regionDefault: {
        carbonIntensity: {
            default: 519
        },
        geometryDescription: defaultObject.features[0].geometry
    }
};

// define fetch for all region that do not have some
for(const regionName in regionsList) {
    const region = regionsList[regionName];
    if ( region.carbonIntensity === undefined ) {
        console.warn("region " + regionName + " got no carbon intensity defined");
    } else {
        if ( region.carbonIntensity.fetch === undefined ) {
            region.carbonIntensity.fetch = () => {
                console.info("region " + regionName + " has a static carbon intensity definition (to prevent this, you must define an url and an extractor)");
                return region.carbonIntensity.default;
            };
        } else {
            // region has already a fetcher...
        }
    }
}

let intervalID = null;

/**
 * Insert the default carbon intensities.
 */
insertDefaultCarbonIntensity = async () => {
    for(const regionName in regionsList) {
        const region = regionsList[regionName];
        if ( region.carbonIntensity.default === undefined || region.carbonIntensity.default === null ) {

        } else {
            await setCarbonIntensityRegion(regionName, region.carbonIntensity.default, region.geometryDescription);
        }
    }
}

/**
 * This class fetch carbon intensity from the remote.
 */
 insertUpdatedCarbonIntensity = async () => {
    for(const name in regionsList) {
        try {
            const regionUpdater = regionsList[name];
            const v = regionUpdater.carbonIntensity.fetch();
            if ( v !== null && v !== undefined && v !== "" ) {
                await setCarbonIntensityRegion(name, v, regionUpdater.geometryDescription);
            }
        } catch (e) {
            console.warn(e.name + " : " + e.message + " for " + name);
        }
    }
    const parameters = await getParameters();
    parameters.lastRefresh = Date.now();
    await setParameters(parameters);
}

/**
 * Init the script.
 */
RU_init = async () => {
    await insertDefaultCarbonIntensity();
    const interval = await getPref("analysis.carbonIntensity.refreshMs");
    await insertUpdatedCarbonIntensity();
    intervalID = setInterval(insertUpdatedCarbonIntensity, interval);
}

/**
 * Stop the script.
 */
RU_stop = () => {
    clearInterval(intervalID);
    intervalID = null;
}

RU_init();

obrowser.storage.onChanged.addListener(async (changes, areaName) => {
    if ( areaName == "local" ) {
        if ( changes["pref"] !== undefined ) {
            RU_stop();
            const ri = await getPref("analysis.carbonIntensity.refreshMs");
            intervalID = setInterval(insertUpdatedCarbonIntensity, ri);
        } else {
            // no changes to preferences
        }
    } else {
        // no used
    }
});

  
obrowser.runtime.onMessage.addListener(async (request, sender, sendResponse) => {

    if (request.action == "reinitCIUpdater") {
        RU_stop();
        await RU_init();
    }

    if ( request.action == "forceCIUpdater" ) {
        await insertUpdatedCarbonIntensity();
    }
});