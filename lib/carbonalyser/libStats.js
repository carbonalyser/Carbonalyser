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
init = async () => {
    carbonIntensityFactorIngCO2PerKWh = await getRegions();
}

/**
 * Get the raw data.
 */
getOrCreateRawData = async (origin) => {
    let rv = await getBrowser().storage.local.get('rawdata');
    rv = rv === undefined || rv.rawdata === undefined ? {} : JSON.parse(rv.rawdata);

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
incBytesPerOrigin = async (classType, origin, bytes) => {
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
    await getBrowser().storage.local.set({rawdata: JSON.stringify(rawdata)});
}

/**
 * Increment the amount of bytes classified as stored in datacenter in the stats storage.
 */
incBytesDataCenter = async (origin, bytes) => {
    await incBytesPerOrigin('datacenter', origin, bytes);
}

/**
 * Increment the amount of bytes classified as coming over network in the stats storage.
 */
incBytesNetwork = async (origin, bytes) => {
    await incBytesPerOrigin('network', origin, bytes);
}

/**
 * Add information on a given region.
 */
setRegion = async (name, region) => {
    const parameters = await getParameters();
    const regions = parameters.regions;
    regions[name] = region;
    await setParameters(parameters);
}

/**
 * Get carbon intensity for region with given name.
 */
getCarbonIntensityRegion = async (name) => {
    const parameters = await getParameters();
    return parameters.regions[name].carbonIntensity;
}

/**
 * Get or set parameters in the storage.
 * Returned object is never null.
 */
getParameters = async () => {
    let v = await getBrowser().storage.local.get('parameters');
    if ( v === undefined || v.parameters === undefined ) {
        v = {regions: {}, lastRefresh: null};
        await getBrowser().storage.local.set({parameters: JSON.stringify(v)});
    } else {
        v = JSON.parse(v.parameters);
    }
    return v;
}

/**
 * Set the refresh interval for carbon intensity processor.
 */
setRefreshInterval = async (interval) => {
    await setPref("analysis.carbonIntensity.refreshMs", interval);
}

/**
 * Get the refresh interval for carbon intensity processor.
 */
getRefreshInterval = async () => {
    return await getPref("analysis.carbonIntensity.refreshMs");
}

capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

lowerFirstLetter = (string) => {
    return string.charAt(0).toLowerCase() + string.slice(1);
}

/**
 * Retrieve regions from the storage.
 */
getRegions = async () => {
    return (await getParameters()).regions;
}

/**
 * Set parameters object in the storage.
 */
setParameters = async (parameters) => {
    await getBrowser().storage.local.set({parameters: JSON.stringify(parameters)});
}

/**
 * Create stats from the raw data.
 */
getStats = async (numberOfResultShow) => {
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

toMegaByteNoRound = (value) => ((value * 0.000001).toFixed(2))
toMegaByte = (value) => (Math.round(value/1000/1000));
toMebiByte = (value) => (Math.round(value/1024/1024));


init();