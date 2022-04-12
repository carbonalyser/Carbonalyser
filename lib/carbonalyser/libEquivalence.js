/**
 * inject the computed equivalence into HTML.
 */
injectEquivalentIntoHTML = async (stats, computedEquivalence) => {
    const megaByteTotal = toMegaByte(stats.total);
    const electricity = await getElectricityModifier();
    document.getElementById('duration').textContent = computedEquivalence.duration.toString();
    document.getElementById('mbTotalValue').textContent = megaByteTotal;
    document.getElementById('kWhTotalValue').textContent = (computedEquivalence.kWhTotal * electricity).toString();
    document.getElementById('gCO2Value').textContent = computedEquivalence.gCO2Total.toString();
    document.getElementById('chargedSmartphonesValue').textContent = computedEquivalence.chargedSmartphones.toString();
    document.getElementById('kmByCarValue').textContent = computedEquivalence.kmByCar.toString();
    document.getElementById('equivalenceTitle').textContent = obrowser.i18n.getMessage('equivalenceTitle', [computedEquivalence.duration.toString(), megaByteTotal, computedEquivalence.kWhTotal.toString(), computedEquivalence.gCO2Total.toString()]);
}

getEmptyEquivalenceObject = () => {
    return {duration: 0, 
        kWhDataCenterTotal: 0, GESDataCenterTotal: 0, 
        kWhNetworkTotal: 0, GESNetworkTotal: 0,
        kWhDeviceTotal: 0, GESDeviceTotal: 0,
        kWhTotal: 0, gCO2Total: 0, kmByCar: 0, chargedSmartphones: 0
    };
}
/**
 * Compute equivalence from the stats object.
 */
computeEquivalenceFromStatsItem = async (stats) => {
    if ( stats.total === 0 ) {
        // storage has been reset, aborting
        return getEmptyEquivalenceObject();
    } else {
        const regions = await getRegions();
        const selectedRegion = await getSelectedRegion();
        let res = await obrowser.storage.local.get('duration');
        res.duration = res.duration === undefined ? 0 : res.duration;
        res.kWhDataCenterTotal = stats.totalDataCenter * kWhPerByteDataCenter;
        res.GESDataCenterTotal = res.kWhDataCenterTotal * regions['default'].carbonIntensity;
        res.kWhNetworkTotal = stats.total * kWhPerByteNetwork;
        res.GESNetworkTotal = res.kWhNetworkTotal * regions['default'].carbonIntensity;
        res.kWhDeviceTotal = res.duration * kWhPerMinuteDevice;
        res.GESDeviceTotal = res.kWhDeviceTotal * regions[selectedRegion].carbonIntensity;
        res.kWhTotal = Math.round(1000 * (res.kWhDataCenterTotal + res.kWhNetworkTotal + res.kWhDeviceTotal)) / 1000;
        res.gCO2Total = Math.round(res.GESDataCenterTotal + res.GESNetworkTotal + res.GESDeviceTotal);
        res.kmByCar = Math.round(1000 * res.gCO2Total / GESgCO2ForOneKmByCar) / 1000;
        res.chargedSmartphones = Math.round(res.gCO2Total / GESgCO2ForOneChargedSmartphone);
        return res;
    }
}