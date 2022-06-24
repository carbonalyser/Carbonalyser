/**
 * Part responsible from carbon intensities updates.
 */

 const updateList = {
    // only CO² emission linked to electricity (not natural gases)
    // so resulting should be CO² emission not CO²eq
    regionUnitedKingdom: {
        url: "https://api.carbonintensity.org.uk/intensity",
        extractor: function (text) {
            return JSON.parse(text).data[0].intensity.actual;
        },
        geometryDescription: 'GBR'
    },
    // at 2022 this represents 90% of people
    regionFrance: {
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
        geometryDescription: 'FRA'
    }
};

let intervalID = null;

/**
 * Insert the default carbon intensities.
 */
insertDefaultCarbonIntensity = async () => {
    // https://app.electricitymap.org/zone/FR 05/05/2022
    await setCarbonIntensityRegion('regionFrance', 80, 'FRA');    
    await setCarbonIntensityRegion('regionEuropeanUnion', 276, EUObjectUnified.features[0].geometry);
    await setCarbonIntensityRegion('regionUnitedStates', 493, 'USA');
    await setCarbonIntensityRegion('regionChina', 681, 'CHN');
    await setCarbonIntensityRegion(DEFAULT_REGION, 519, defaultObject.geometry);
}

/**
 * This class fetch carbon intensity from the remote.
 */
 insertUpdatedCarbonIntensity = async () => {
    for(const name in updateList) {
        try {
            const regionUpdater = updateList[name];
            const xhr = new XMLHttpRequest();
            xhr.open("GET", regionUpdater.url, false);
            xhr.send();
            const v = regionUpdater.extractor(xhr.responseText);
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
CIU_init = async () => {
    await insertDefaultCarbonIntensity();
    const interval = await getPref("analysis.carbonIntensity.refreshMs");
    await insertUpdatedCarbonIntensity();
    intervalID = setInterval(insertUpdatedCarbonIntensity, interval);
}

/**
 * Stop the script.
 */
CIU_stop = () => {
    clearInterval(intervalID);
    intervalID = null;
}

CIU_init();

obrowser.storage.onChanged.addListener(async (changes, areaName) => {
    if ( areaName == "local" ) {
        if ( changes["pref"] !== undefined ) {
            CIU_stop();
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
        CIU_stop();
        await CIU_init();
    }

    if ( request.action == "forceCIUpdater" ) {
        await insertUpdatedCarbonIntensity();
    }
});