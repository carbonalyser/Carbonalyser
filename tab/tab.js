translate = (translationKey) => {
    return chrome.i18n.getMessage(translationKey);
}

translateText = (target, translationKey) => {
    target.appendChild(document.createTextNode(translate(translationKey)));
}

translateHref = (target, translationKey) => {
    target.href = chrome.i18n.getMessage(translationKey);
}
  
document.querySelectorAll('[translate]').forEach(function(element) {
    translateText(element, element.getAttribute('translate'));
  });
  
document.querySelectorAll('[translate-href]').forEach(function(element) {
    translateHref(element, element.getAttribute('translate-href'));
});
  
getOrCreateStats = () => {
    const stats = localStorage.getItem('stats');
    const statsJson = null === stats ? {bytesDataCenter: {}, bytesNetwork: {}} : JSON.parse(stats);
    return statsJson;
}

const stats = getOrCreateStats();

const topResults = document.getElementById("topResults");
for(let origin in stats.bytesDataCenter) {
    const tr = document.createElement("tr");
    const site = document.createElement("td");
    site.textContent = origin;
    const data = document.createElement("td");
    data.textContent = (stats.bytesDataCenter[origin] * 0.000001).toFixed(2);
    const network = document.createElement("td");
    network.textContent = ((stats.bytesNetwork[origin] + stats.bytesDataCenter[origin]) * 0.000001).toFixed(2);
    tr.appendChild(site);
    tr.appendChild(data);
    tr.appendChild(network);
    topResults.appendChild(tr);
}