translate = (translationKey) => {
    return chrome.i18n.getMessage(translationKey);
}

translateText = (target, translationKey) => {
    target.appendChild(document.createTextNode(translate(translationKey)));
}

translateHref = (target, translationKey) => {
    target.href = chrome.i18n.getMessage(translationKey);
}

getOrCreateStats = () => {
    const stats = localStorage.getItem('stats');
    const statsJson = null === stats ? {bytesDataCenter: {}, bytesNetwork: {}} : JSON.parse(stats);
    return statsJson;
}

loadTranslations = () => {
    document.querySelectorAll('[translate]').forEach(function(element) {
        translateText(element, element.getAttribute('translate'));
    });
      
    document.querySelectorAll('[translate-href]').forEach(function(element) {
        translateHref(element, element.getAttribute('translate-href'));
    });
}

extractHostname = (url) => {
    let hostname = url.indexOf("//") > -1 ? url.split('/')[2] : url.split('/')[0];
  
    // find & remove port number
    hostname = hostname.split(':')[0];
    // find & remove "?"
    hostname = hostname.split('?')[0];

    return hostname;
};

// increment some stat in the stats storage.
incBytesPerOrigin = (classType, origin, bytes) => {
    const statsJson = getOrCreateStats();
    const bytePerOrigin = undefined === statsJson[classType][origin] ? 0 : parseInt(statsJson[classType][origin]);
    statsJson[classType][origin] = bytePerOrigin + bytes;
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

isChrome = () => {
    return (typeof(browser) === 'undefined');
};

// Firefox 1.0+ - detect Gecko engine
isFirefox = () => {
    return (typeof InstallTrigger !== 'undefined');
};

parseStats = () => {
    const stats = localStorage.getItem('stats');
    return null === stats ? {bytesDataCenter: {}, bytesNetwork: {}} : JSON.parse(stats);
}

getStats = (numberOfResultShow) => {
    const stats = parseStats();
    let total = 0;
    let totalDataCenter = 0, totalNetwork = 0;
    const sortedStats = [];

    for (let origin in stats.bytesDataCenter) {
        totalDataCenter += stats.bytesDataCenter[origin];
        sortedStats.push({ 'origin': origin, 'byte': stats.bytesDataCenter[origin] });
    }

    for (let origin in stats.bytesNetwork) {
        totalNetwork += stats.bytesNetwork[origin];

        const found = sortedStats.find(element => element.origin == origin);
        if ( found ===undefined ) {
            sortedStats.push({ 'origin': origin, 'byte': stats.bytesNetwork[origin]});
        } else {
            found.byte += stats.bytesNetwork[origin];
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