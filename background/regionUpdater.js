/**
 * Update informations of parts of the world.
 */

/**
 * Retrieve the current value of carbon intensity for the given region.
 */
regionFetchExtractor = (regionUpdater) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", regionUpdater.carbonIntensity.url, false);
    xhr.send();
    if ( xhr.status === 200 ) {
        return regionUpdater.carbonIntensity.extractor(xhr.responseText);
    }
};

const regionUpdateList = {
    // only CO² emission linked to electricity (not natural gases)
    // so resulting should be CO² emission not CO²eq
    regionUnitedKingdom: {
        carbonIntensity: {
            url: "https://api.carbonintensity.org.uk/intensity",
            extractor: (text) => {
                return JSON.parse(text).data[0].intensity.actual;
            }
        },
        geometryDescription: 'GBR'
    },
    // at 2022 this represents 90% of people
    regionFrance: {
        carbonIntensity: {
            url: "https://opendata.edf.fr/api/records/1.0/search/?dataset=indicateurs-de-performance-extra-financiere&q=&facet=annee&facet=engagements_rse&facet=csr_goals&facet=indicateurs_cles_de_performance&facet=performance_indicators&refine.indicateurs_cles_de_performance=Intensit%C3%A9+carbone%C2%A0%3A+%C3%A9missions+sp%C3%A9cifiques+de+CO2+dues+%C3%A0+la+production+d%E2%80%99%C3%A9lectricit%C3%A9+%E2%88%9A+(gCO2%2FkWh)",
            extractor: function (text) {
                const records = JSON.parse(text).records;
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
            },
            default: 80
        },
        geometryDescription: 'FRA'
    }
};

// define fetch for all region that do not have some
for(const regionName in regionUpdateList) {
    const region = regionUpdateList[regionName];
    if ( region.carbonIntensity === undefined ) {
        console.warn("region " + regionName + " got no carbon intensity defined");
    } else {
        if ( region.carbonIntensity.fetch === undefined ) {
            region.carbonIntensity.fetch = () => {
                if ( region.carbonIntensity.url === undefined || region.carbonIntensity.extractor === undefined ) {
                    throw "Configuration error missing properties to fetch carbon intensities";
                }
                return regionFetchExtractor(region);
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
    // https://app.electricitymap.org/zone/FR 05/05/2022
    await setCarbonIntensityRegion('regionEuropeanUnion', 276, EUObjectUnified.features[0].geometry);
    await setCarbonIntensityRegion('regionUnitedStates', 493, 'USA');
    await setCarbonIntensityRegion('regionChina', 681, 'CHN');
    await setCarbonIntensityRegion(DEFAULT_REGION, 519, defaultObject.features[0].geometry);

    for(const regionName in regionUpdateList) {
        const region = regionUpdateList[regionName];
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
    for(const name in regionUpdateList) {
        try {
            const regionUpdater = regionUpdateList[name];
            regionUpdater.carbonIntensity.fetch();
            if ( v !== null && v !== undefined && v !== "" ) {
                await setCarbonIntensityRegion(name, v, regionUpdater.geometryDescription);
            }
        } catch (e) {
            console.warn(e.name + " : " + e.message);
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