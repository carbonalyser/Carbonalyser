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
    res.GESDataCenterTotal = res.kWhDataCenterTotal * regions['default'].carbonIntensity;
    res.kWhNetworkTotal = stats.total * (await getPref("general.kWhPerByteNetwork"));
    res.GESNetworkTotal = res.kWhNetworkTotal * regions['default'].carbonIntensity;
    res.GESDeviceTotal = res.kWhDeviceTotal * regions[selectedRegion].carbonIntensity;
    res.kWhTotal = Math.round(1000 * (res.kWhDataCenterTotal + res.kWhNetworkTotal + res.kWhDeviceTotal)) / 1000;
    res.gCO2Total = Math.round(res.GESDataCenterTotal + res.GESNetworkTotal + res.GESDeviceTotal);
    res.kmByCar = Math.round(1000 * res.gCO2Total / (await getPref("general.GESgCO2ForOneKmByCar"))) / 1000;
    res.chargedSmartphones = Math.round(res.kWhTotal / (await getPref("general.equivalence.smartphone.capacityWh") / 1000));
    res.OneHourBulbNumber = res.kWhTotal / (await getPref("general.BulbConsumptionW") * 0.001);
    return res;
}