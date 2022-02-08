/**
 * Part of the lib that is onluy responsible from displaying.
 */
translate = (translationKey) => {
    return chrome.i18n.getMessage(translationKey);
}

translateText = (target, translationKey) => {
    target.appendChild(document.createTextNode(translate(translationKey)));
}

translateHref = (target, translationKey) => {
    target.href = chrome.i18n.getMessage(translationKey);
}

loadTranslations = () => {
    document.querySelectorAll('[translate]').forEach(function(element) {
        translateText(element, element.getAttribute('translate'));
    });
      
    document.querySelectorAll('[translate-href]').forEach(function(element) {
        translateHref(element, element.getAttribute('translate-href'));
    });
}

injectEquivalentIntoHTML = (stats, computedEquivalence) => {
    const megaByteTotal = toMegaByte(stats.total);
    document.getElementById('duration').textContent = computedEquivalence.duration.toString();
    document.getElementById('mbTotalValue').textContent = megaByteTotal;
    document.getElementById('kWhTotalValue').textContent = computedEquivalence.kWhTotal.toString();
    document.getElementById('gCO2Value').textContent = computedEquivalence.gCO2Total.toString();
    document.getElementById('chargedSmartphonesValue').textContent = computedEquivalence.chargedSmartphones.toString();
    document.getElementById('kmByCarValue').textContent = computedEquivalence.kmByCar.toString();
    document.getElementById('equivalenceTitle').textContent = chrome.i18n.getMessage('equivalenceTitle', [computedEquivalence.duration.toString(), megaByteTotal, computedEquivalence.kWhTotal.toString(), computedEquivalence.gCO2Total.toString()]);
}

isChrome = () => {
    return (typeof(browser) === 'undefined');
};

// Firefox 1.0+ - detect Gecko engine
isFirefox = () => {
    return (typeof InstallTrigger !== 'undefined');
};

/**
 * Part of the lib that extract and compute data.
 */
const defaultCarbonIntensityFactorIngCO2PerKWh = 519;
const kWhPerByteDataCenter = 0.000000000072;
const kWhPerByteNetwork = 0.000000000152;
const kWhPerMinuteDevice = 0.00021;

const GESgCO2ForOneKmByCar = 220;
const GESgCO2ForOneChargedSmartphone = 8.3;

const carbonIntensityFactorIngCO2PerKWh = {
    'regionEuropeanUnion': 276,
    'regionFrance': 34.8,
    'regionUnitedStates': 493,
    'regionChina': 681,
    'regionOther': defaultCarbonIntensityFactorIngCO2PerKWh
};

const defaultLocation = 'regionOther';
let userLocation = defaultLocation;

extractHostname = (url) => {
    let hostname = url.indexOf("//") > -1 ? url.split('/')[2] : url.split('/')[0];
  
    // find & remove port number
    hostname = hostname.split(':')[0];
    // find & remove "?"
    hostname = hostname.split('?')[0];

    return hostname;
};

getOrCreateStats = () => {
    const stats = localStorage.getItem('stats');
    const statsJson = null === stats ? {bytesDataCenter: {}, bytesNetwork: {}} : JSON.parse(stats);
    return statsJson;
}

// increment some stat in the stats storage.
incBytesPerOrigin = (classType, origin, bytes) => {
    const statsJson = getOrCreateStats();
    const ts = Date.now();
    let originStorage = statsJson[classType][origin];
    if ( undefined === originStorage ) {
        originStorage = {total: 0, dots: {}};
    }
    originStorage.total += bytes;
    if ( originStorage.dots[ts] === undefined ) {
        originStorage.dots[ts] = 0;
    }
    originStorage.dots[ts] += bytes;
    statsJson[classType][origin] = originStorage;
    console.error("statsJson=", statsJson);
    localStorage.setItem('stats', JSON.stringify(statsJson));
}

// increment the amount of bytes classified as stored in datacenter in the stats storage.
incBytesDataCenter = (origin, bytes) => {
    incBytesPerOrigin("bytesDataCenter", origin, bytes);
}

// increment the amount of bytes classified as coming over network in the stats storage.
incBytesNetwork = (origin, bytes) => {
    incBytesPerOrigin("bytesNetwork", origin, bytes);
}

// get the region from the storage and set it in the global variable userLocation
getSelectedRegion = () => {
    const selectedRegion = localStorage.getItem('selectedRegion');
  
    if (null !== selectedRegion) {
      userLocation = selectedRegion;
    }
  
    return selectedRegion;
}

// Take a stats object for instance the one from getStats()
computeEquivalenceFromStatsItem = (stats) => {
    let res = {};
    res.duration = localStorage.getItem('duration');
    res.duration = null === res.duration ? 0 : res.duration;

    res.kWhDataCenterTotal = stats.totalDataCenter * kWhPerByteDataCenter;
    res.GESDataCenterTotal = res.kWhDataCenterTotal * defaultCarbonIntensityFactorIngCO2PerKWh;

    res.kWhNetworkTotal = stats.total * kWhPerByteNetwork;
    res.GESNetworkTotal = res.kWhNetworkTotal * defaultCarbonIntensityFactorIngCO2PerKWh;

    res.kWhDeviceTotal = res.duration * kWhPerMinuteDevice;
    res.GESDeviceTotal = res.kWhDeviceTotal * carbonIntensityFactorIngCO2PerKWh[userLocation];

    res.kWhTotal = Math.round(1000 * (res.kWhDataCenterTotal + res.kWhNetworkTotal + res.kWhDeviceTotal)) / 1000;
    res.gCO2Total = Math.round(res.GESDataCenterTotal + res.GESNetworkTotal + res.GESDeviceTotal);

    res.kmByCar = Math.round(1000 * res.gCO2Total / GESgCO2ForOneKmByCar) / 1000;
    res.chargedSmartphones = Math.round(res.gCO2Total / GESgCO2ForOneChargedSmartphone);

    return res;
}

getStats = (numberOfResultShow) => {
    const stats = getOrCreateStats();
    let total = 0;
    let totalDataCenter = 0, totalNetwork = 0;
    const sortedStats = [];

    for (let origin in stats.bytesDataCenter) {
        totalDataCenter += stats.bytesDataCenter[origin].total;
        sortedStats.push({ 'origin': origin, 'byte': stats.bytesDataCenter[origin].total });
    }

    for (let origin in stats.bytesNetwork) {
        totalNetwork += stats.bytesNetwork[origin].total;

        const found = sortedStats.find(element => element.origin == origin);
        if ( found ===undefined ) {
            sortedStats.push({ 'origin': origin, 'byte': stats.bytesNetwork[origin].total});
        } else {
            found.byte += stats.bytesNetwork[origin].total;
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