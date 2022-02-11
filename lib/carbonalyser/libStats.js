/**
 *
 * Part of the lib that compute stats.
 * 
 */

const kWhPerByteDataCenter = 0.000000000072;
const kWhPerByteNetwork = 0.000000000152;
const kWhPerMinuteDevice = 0.00021;

const GESgCO2ForOneKmByCar = 220;
const GESgCO2ForOneChargedSmartphone = 8.3;

const defaultCarbonIntensityFactorIngCO2PerKWh = 519;
const carbonIntensityFactorIngCO2PerKWh = {
    'regionEuropeanUnion': 276,
    'regionFrance': 34.8,
    'regionUnitedStates': 493,
    'regionChina': 681,
    'regionOther': defaultCarbonIntensityFactorIngCO2PerKWh
};

const defaultLocation = 'regionOther';
let userLocation = defaultLocation;

/**
 * Get the raw data.
 */
getOrCreateRawData = () => {
    const rawData = localStorage.getItem('rawData');
    return null === rawData ? {bytesDataCenter: {}, bytesNetwork: {}} : JSON.parse(rawData);
}

/**
 * increment some stat in the stats storage.
 */
incBytesPerOrigin = (classType, origin, bytes) => {
    const rawData = getOrCreateRawData();
    const ts = Date.now();
    let originStorage = rawData[classType][origin];
    if ( undefined === originStorage ) {
        originStorage = {total: 0, dots: {}};
    }
    originStorage.total += bytes;
    if ( originStorage.dots[ts] === undefined ) {
        originStorage.dots[ts] = 0;
    }
    originStorage.dots[ts] += bytes;
    rawData[classType][origin] = originStorage;
    localStorage.setItem('rawData', JSON.stringify(rawData));
}

/**
 * Increment the amount of bytes classified as stored in datacenter in the stats storage.
 */
incBytesDataCenter = (origin, bytes) => {
    incBytesPerOrigin('bytesDataCenter', origin, bytes);
}

/**
 * Increment the amount of bytes classified as coming over network in the stats storage.
 */
incBytesNetwork = (origin, bytes) => {
    incBytesPerOrigin("bytesNetwork", origin, bytes);
}

/**
 * Get the region from the storage and set it in the global variable userLocation.
 */
getSelectedRegion = () => {
    const selectedRegion = localStorage.getItem('selectedRegion');
  
    if (null !== selectedRegion) {
      userLocation = selectedRegion;
    }
  
    return selectedRegion;
}

/**
 * Create stats from the raw data.
 */
getStats = (numberOfResultShow) => {
    const rawData = getOrCreateRawData();
    let total = 0;
    let totalDataCenter = 0, totalNetwork = 0;
    const sortedStats = [];

    for (let origin in rawData.bytesDataCenter) {
        totalDataCenter += rawData.bytesDataCenter[origin].total;
        sortedStats.push({ 'origin': origin, 'byte': rawData.bytesDataCenter[origin].total });
    }

    for (let origin in rawData.bytesNetwork) {
        totalNetwork += rawData.bytesNetwork[origin].total;

        const found = sortedStats.find(element => element.origin == origin);
        if ( found ===undefined ) {
            sortedStats.push({ 'origin': origin, 'byte': rawData.bytesNetwork[origin].total});
        } else {
            found.byte += rawData.bytesNetwork[origin].total;
        }
    }

    total = totalDataCenter + totalNetwork;

    sortedStats.sort(function(a, b) {
        return a.byte < b.byte ? 1 : a.byte > b.byte ? -1 : 0
    });

    let highestStats;
    if ( numberOfResultShow === undefined ) {
        highestStats = sortedStats;
    } else {
        if ( numberOfResultShow <= 0 ) {
            console.error("you specified " + numberOfResultShow + " as the number of results to show ...");
            return undefined;
        } else {
            highestStats = sortedStats.slice(0, numberOfResultShow-1);
        }
    }
    let subtotal = 0;
    for (let index in highestStats) {
        subtotal += highestStats[index].byte;
    }

    if (total > 0) {
        const remaining = total - subtotal;
        if (remaining > 0) {
            highestStats.push({'origin': translate('statsOthers'), 'byte': remaining});
        }

        highestStats.forEach(function (item) {
            item.percent = Math.round(100 * item.byte / total)
        });
    }

    return {
        'total': total,
        'totalDataCenter': totalDataCenter,
        'totalNetwork': totalNetwork,
        'highestStats': highestStats
    }
}

toMegaByteNoRound = (value) => ((value * 0.000001).toFixed(2))
toMegaByte = (value) => (Math.round(value/1000/1000));
toMebiByte = (value) => (Math.round(value/1024/1024));