/**
 * inject the computed equivalence into HTML.
 */
injectEquivalentIntoHTML = async (stats, computedEquivalence) => {
    const megaByteTotal = toMegaByte(stats.total);
    const electricity = await getElectricityModifier();
    const electricityUnitText = await getPref("general.electricityUnit");
    const electricityConverted = (computedEquivalence.kWhTotal * (electricity*1000000)).toFixed(3).toString().replace(/\.?0*$/,"");
    const cigarette = computedEquivalence.gCO2Total / (await getPref("general.equivalence.cigarette"));
    document.getElementById('duration').textContent = computedEquivalence.duration.toString();
    document.getElementById('mbTotalValue').textContent = megaByteTotal;    
    document.getElementById('kWhTotalValue').textContent = electricityConverted;
    document.getElementById('gCO2Value').textContent = computedEquivalence.gCO2Total.toString();
    document.getElementById('chargedSmartphonesValue').textContent = computedEquivalence.chargedSmartphones.toString();
    document.getElementById('kmByCarValue').textContent = computedEquivalence.kmByCar.toString();
    document.getElementById('equivalenceTitle').textContent = obrowser.i18n.getMessage('equivalenceTitle', [computedEquivalence.duration.toString(), megaByteTotal, electricityConverted, electricityUnitText, computedEquivalence.gCO2Total.toString()]);
    document.getElementById('OneHourBulbNumberValue').textContent = computedEquivalence.OneHourBulbNumber.toFixed(1).toString();
    document.getElementById('tab_equivalence_cigarette_value').textContent = cigarette.toFixed(1).toString();
}

getEmptyEquivalenceObject = () => {
    return {duration: 0, 
        kWhDataCenterTotal: 0, GESDataCenterTotal: 0, 
        kWhNetworkTotal: 0, GESNetworkTotal: 0,
        kWhDeviceTotal: 0, GESDeviceTotal: 0,
        kWhTotal: 0, gCO2Total: 0, kmByCar: 0, chargedSmartphones: 0,
        OneHourBulbNumber: 0
    };
}

/**
 * Get current position of user as {longitude,latitude} object.
 */
fetchCurrentPosition = async () => {
    const position = await new Promise(function (resolve, reject) {
        // Promisifying the geolocation API
        navigator.geolocation.getCurrentPosition(
            (position) => resolve(position.coords.longitude + "," + position.coords.latitude),
            (error) => reject(error), {
                enableHighAccuracy: true
            }
        );
    });
    const positionArr = position.split(",");
    return {longitude: parseFloat(positionArr[0]), latitude: parseFloat(positionArr[1])};
}

/**
 * Select automatically the current region.<br />
 * The most precise region (the smaller geo area).<br />
 * Assuming regions have all been loaded.
 */
autoSelectCurrentRegion = async () => {
    const currentPosition = await fetchCurrentPosition();
    const regions = await getRegions();
    let min = Number.MAX_SAFE_INTEGER;
    let minName = null;
    for(const regionName in regions) {
        const region = regions[regionName];
        const regionObject = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    properties: {
                    },
                    geometry: region.geometry
                }
            ]
        };
        if ( d3.geoContains(regionObject, [currentPosition.longitude, currentPosition.latitude]) ) {
            let area;
            if ( regionName === DEFAULT_REGION ) { // small hack
                area = Number.MAX_SAFE_INTEGER;
            } else {
                area = d3.geoArea(region.geometry);
            }
            if ( area <= min ) {
                min = area;
                minName = regionName;
            }
        }
    }
    if ( minName === null ) {
        throw "No minimal region found for the current position : " + JSON.stringify(currentPosition);
    } else {
        await setSelectedRegion(minName);
    }
}

/**
 * When no country is setup / selected by user we try to get user location from a 3rd party.
 */
 autoSelectCurrentRegionIfEmpty = async () => {
    let selectedRegion = await getPref("analysis.selectedRegion");
    if ( selectedRegion === undefined ) {
        await autoSelectCurrentRegion();
    }
}

/**
 * Compute equivalence from the stats object.
 */
computeEquivalenceFromStatsItem = async (stats) => {
    const res = getEmptyEquivalenceObject();
    const regions = await getRegions();
    const selectedRegion = await getSelectedRegion();
    let duration = (await obrowser.storage.local.get('duration')).duration;
    res.duration = duration === undefined ? 0 : JSON.parse(duration).total;
    res.kWhDeviceTotal = res.duration * (await getKWhMinute());
    res.kWhDataCenterTotal = stats.totalDataCenter * (await getPref("general.kWhPerByteDataCenter"));
    res.GESDataCenterTotal = res.kWhDataCenterTotal * regions[DEFAULT_REGION].carbonIntensity;
    res.kWhNetworkTotal = stats.total * (await getPref("general.kWhPerByteNetwork"));
    res.GESNetworkTotal = res.kWhNetworkTotal * regions[DEFAULT_REGION].carbonIntensity;
    res.GESDeviceTotal = res.kWhDeviceTotal * regions[selectedRegion].carbonIntensity;
    res.kWhTotal = Math.round(1000 * (res.kWhDataCenterTotal + res.kWhNetworkTotal + res.kWhDeviceTotal)) / 1000;
    res.gCO2Total = Math.round(res.GESDataCenterTotal + res.GESNetworkTotal + res.GESDeviceTotal);
    res.kmByCar = Math.round(1000 * res.gCO2Total / (await getPref("general.GESgCO2ForOneKmByCar"))) / 1000;
    res.chargedSmartphones = Math.round(res.kWhTotal / (await getPref("general.equivalence.smartphone.capacityWh") / 1000));
    res.OneHourBulbNumber = res.kWhTotal / (await getPref("general.BulbConsumptionW") * 0.001);
    return res;
}