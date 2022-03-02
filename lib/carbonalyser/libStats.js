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
getOrCreateRawData = (origin) => {
    let rv = localStorage.getItem('rawdata');
    rv = null === rv ? {} : JSON.parse(rv);

    if ( origin !== undefined ) {
        if ( rv[origin] === undefined ) {
            rv = {datacenter: {total: 0, dots: {}}, network: {total: 0, dots: {}}};
        } else {
            rv = rv[origin];
        }
    }

    return rv;
}

/**
 * increment some stat in the stats storage.
 */
incBytesPerOrigin = (classType, origin, bytes) => {
    const rawdata = getOrCreateRawData();
    const ts = Date.now();
    const originStorage = getOrCreateRawData(origin);
    const originClassTypeStorage = originStorage[classType];
    originClassTypeStorage.total += bytes;
    if ( originClassTypeStorage.dots[ts] === undefined ) {
        originClassTypeStorage.dots[ts] = 0;
    }
    originClassTypeStorage.dots[ts] += bytes;
    rawdata[origin] = originStorage;
    localStorage.setItem('rawdata', JSON.stringify(rawdata));
}

/**
 * Increment the amount of bytes classified as stored in datacenter in the stats storage.
 */
incBytesDataCenter = (origin, bytes) => {
    incBytesPerOrigin('datacenter', origin, bytes);
}

/**
 * Increment the amount of bytes classified as coming over network in the stats storage.
 */
incBytesNetwork = (origin, bytes) => {
    incBytesPerOrigin('network', origin, bytes);
}

/**
 * Get the region from the storage and set it in the global variable userLocation.
 */
getSelectedRegion = () => {
    const params = getParameters();
    const selectedRegion = params.selectedRegion;
    if ( selectedRegion == null ) {
        return null;
    }
  
    userLocation = selectedRegion;
  
    return selectedRegion;
}

/**
 * Get or set parameters in the storage.
 * Returned object is never null.
 */
getParameters = () => {
    let p = localStorage.getItem("parameters");
    if ( p === null ) {
        p = {selectedRegion: null};
        localStorage.setItem("parameters", p);
    }
    return p;
}

/**
 * Set in storage the region selected by user.
 */
setSelectedRegion = (selectedRegion) => {
    const p = getParameters();
    p.selectedRegion = selectedRegion;
}

/**
 * Create stats from the raw data.
 */
getStats = (numberOfResultShow) => {
    const rawdata = getOrCreateRawData();
    let total = 0;
    let totalDataCenter = 0, totalNetwork = 0;
    const sortedStats = [];

    for (let origin in rawdata) {
        const rdo = getOrCreateRawData(origin);
        totalDataCenter += rdo.datacenter.total;
        totalNetwork    += rdo.network.total;
        sortedStats.push({ 'origin': origin, 'byte': (rdo.datacenter.total + rdo.network.total) });
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
            highestStats = sortedStats.slice(0, numberOfResultShow);
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