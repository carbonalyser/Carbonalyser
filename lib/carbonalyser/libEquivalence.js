const data = {
    equivalence: null
};

/**
 * inject the computed equivalence into HTML.
 */
const injectEquivalentIntoHTML = (stats, computedEquivalence) => {
    const megaByteTotal = toMegaByte(stats.total);
    document.getElementById('duration').textContent = computedEquivalence.duration.toString();
    document.getElementById('mbTotalValue').textContent = megaByteTotal;
    document.getElementById('kWhTotalValue').textContent = computedEquivalence.kWhTotal.toString();
    document.getElementById('gCO2Value').textContent = computedEquivalence.gCO2Total.toString();
    document.getElementById('chargedSmartphonesValue').textContent = computedEquivalence.chargedSmartphones.toString();
    document.getElementById('kmByCarValue').textContent = computedEquivalence.kmByCar.toString();
    document.getElementById('equivalenceTitle').textContent = obrowser.i18n.getMessage('equivalenceTitle', [computedEquivalence.duration.toString(), megaByteTotal, computedEquivalence.kWhTotal.toString(), computedEquivalence.gCO2Total.toString()]);
}

/**
 * Compute equivalence from the stats object.
 */
const computeEquivalenceFromStatsItem = async (stats) => {
    let res = await obrowser.storage.local.get('duration');
    res.duration = res.duration === undefined ? 0 : res.duration;

    res.kWhDataCenterTotal = stats.totalDataCenter * kWhPerByteDataCenter;
    res.GESDataCenterTotal = res.kWhDataCenterTotal * carbonIntensityFactorIngCO2PerKWh['default'].carbonIntensity;

    res.kWhNetworkTotal = stats.total * kWhPerByteNetwork;
    res.GESNetworkTotal = res.kWhNetworkTotal * carbonIntensityFactorIngCO2PerKWh['default'].carbonIntensity;

    res.kWhDeviceTotal = res.duration * kWhPerMinuteDevice;
    res.GESDeviceTotal = res.kWhDeviceTotal * carbonIntensityFactorIngCO2PerKWh[await getSelectedRegion()].carbonIntensity;

    res.kWhTotal = Math.round(1000 * (res.kWhDataCenterTotal + res.kWhNetworkTotal + res.kWhDeviceTotal)) / 1000;
    res.gCO2Total = Math.round(res.GESDataCenterTotal + res.GESNetworkTotal + res.GESDeviceTotal);

    res.kmByCar = Math.round(1000 * res.gCO2Total / GESgCO2ForOneKmByCar) / 1000;
    res.chargedSmartphones = Math.round(res.gCO2Total / GESgCO2ForOneChargedSmartphone);

    return res;
}

const updateEquivalence = async (stats) => {
    data.equivalence = await computeEquivalenceFromStatsItem(stats);
    injectEquivalentIntoHTML(stats, data.equivalence);
}