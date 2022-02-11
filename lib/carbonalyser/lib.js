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