loadTranslations();

const statsStorage = getOrCreateStats();
const topResults = document.getElementById("topResults");
const stats = getStats();

console.error(stats);
for(let i = 0; i < stats.highestStats.length; i ++) {
    const stat = stats.highestStats[i];
    const percent = document.createElement("td");
    const tr = document.createElement("tr");
    const site = document.createElement("td");
    const data = document.createElement("td");
    const network = document.createElement("td");
    percent.textContent = stat.percent;
    site.textContent = stat.origin;
    data.textContent = (statsStorage.bytesDataCenter[stat.origin] * 0.000001).toFixed(2);
    network.textContent = ((statsStorage.bytesNetwork[stat.origin] + statsStorage.bytesDataCenter[stat.origin]) * 0.000001).toFixed(2);
    tr.appendChild(percent);
    tr.appendChild(site);
    tr.appendChild(data);
    tr.appendChild(network);
    topResults.appendChild(tr);
}