loadTranslations();

const statsStorage = getOrCreateStats();
const topResults = document.getElementById("topResults");
const stats = getStats();

for(let i = 0; i < stats.highestStats.length; i ++) {
    const stat = stats.highestStats[i];
    const tr = document.createElement("tr");
    const percent = document.createElement("td");
    const site = document.createElement("td");
    const data = document.createElement("td");
    const network = document.createElement("td");
    tr.className = "oneResult";
    percent.textContent = stat.percent;
    site.textContent = stat.origin;
    data.textContent = toMegaByte(statsStorage.bytesDataCenter[stat.origin]).toFixed(2);
    network.textContent = toMegaByte(statsStorage.bytesNetwork[stat.origin] + statsStorage.bytesDataCenter[stat.origin]).toFixed(2);
    tr.appendChild(percent);
    tr.appendChild(site);
    tr.appendChild(data);
    tr.appendChild(network);
    topResults.appendChild(tr);
}

selectRegionHandler = (event) => {
    const selectedRegion = event.target.value;
  
    if ('' === selectedRegion) {
      return;
    }
  
    localStorage.setItem('selectedRegion', selectedRegion);
    userLocation = selectedRegion;
}

const selectRegion = document.getElementById('selectRegion');
selectRegion.addEventListener('change', selectRegionHandler);