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



let carbonIntensityFactorIngCO2PerKWh = {};

/**
 * Initialize the library.
 */
const init = async () => {
    carbonIntensityFactorIngCO2PerKWh = await getRegions();
}

/**
 * Get the raw data.
 */
const getOrCreateRawData = async (origin) => {
    let rv = await obrowser.storage.local.get('rawdata');
    rv = rv.rawdata === undefined ? {} : JSON.parse(rv.rawdata);

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
const incBytesPerOrigin = async (classType, origin, bytes) => {
    const rawdata = await getOrCreateRawData();
    const ts = Date.now();
    const originStorage = await getOrCreateRawData(origin);
    const originClassTypeStorage = originStorage[classType];
    originClassTypeStorage.total += bytes;
    if ( originClassTypeStorage.dots[ts] === undefined ) {
        originClassTypeStorage.dots[ts] = 0;
    }
    originClassTypeStorage.dots[ts] += bytes;
    rawdata[origin] = originStorage;
    await obrowser.storage.local.set({rawdata: JSON.stringify(rawdata)});
}

/**
 * Increment the amount of bytes classified as stored in datacenter in the stats storage.
 */
const incBytesDataCenter = async (origin, bytes) => {
    await incBytesPerOrigin('datacenter', origin, bytes);
}

/**
 * Increment the amount of bytes classified as coming over network in the stats storage.
 */
const incBytesNetwork = async (origin, bytes) => {
    await incBytesPerOrigin('network', origin, bytes);
}

/**
 * Add information on a given region.
 */
const setRegion = async (name, region) => {
    const parameters = await getParameters();
    const regions = parameters.regions;
    regions[name] = region;
    await setParameters(parameters);
}

/**
 * Get carbon intensity for region with given name.
 */
const getCarbonIntensityRegion = async (name) => {
    const parameters = await getParameters();
    return parameters.regions[name].carbonIntensity;
}

/**
 * Get or set parameters in the storage.
 * Returned object is never null.
 */
const getParameters = async () => {
    let v = await obrowser.storage.local.get('parameters');
    if ( v.parameters === undefined ) {
        v = {regions: {}, lastRefresh: null};
        await obrowser.storage.local.set({parameters: JSON.stringify(v)});
    } else {
        v = JSON.parse(v.parameters);
    }
    return v;
}

/**
 * Set the refresh interval for carbon intensity processor.
 */
const setRefreshInterval = async (interval) => {
    await setPref("analysis.carbonIntensity.refreshMs", interval);
}

/**
 * Get the refresh interval for carbon intensity processor.
 */
const getRefreshInterval = async () => {
    return await getPref("analysis.carbonIntensity.refreshMs");
}

const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

const lowerFirstLetter = (string) => {
    return string.charAt(0).toLowerCase() + string.slice(1);
}

/**
 * Retrieve regions from the storage.
 */
const getRegions = async () => {
    return (await getParameters()).regions;
}

/**
 * Set parameters object in the storage.
 */
const setParameters = async (parameters) => {
    await obrowser.storage.local.set({parameters: JSON.stringify(parameters)});
}

/**
 * Create stats from the raw data.
 */
const getStats = async (numberOfResultShow) => {
    const rawdata = await getOrCreateRawData();
    let total = 0;
    let totalDataCenter = 0, totalNetwork = 0;
    const sortedStats = [];

    for (let origin in rawdata) {
        const rdo = await getOrCreateRawData(origin);
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

const toMegaByteNoRound = (value) => ((value * 0.000001).toFixed(2))
const toMegaByte = (value) => (Math.round(value/1000/1000));
const toMebiByte = (value) => (Math.round(value/1024/1024));


init();