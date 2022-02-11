let statsInterval;
let pieChart;

showStats = () => {
  const stats = getStats(5);

  if (stats.total === 0) {
    return;
  }

  show(statsElement);
  const labels = [];
  const series = [];

  const statsListItemsElement = document.getElementById('statsListItems');
  while (statsListItemsElement.firstChild) {
    statsListItemsElement.removeChild(statsListItemsElement.firstChild);
  }

  for (let index in stats.highestStats) {
    if (stats.highestStats[index].percent < 1) {
      continue;
    }

    labels.push(stats.highestStats[index].origin);
    series.push(stats.highestStats[index].percent);
    const text = document.createTextNode(`${stats.highestStats[index].percent}% ${stats.highestStats[index].origin}`);
    const li = document.createElement("LI");
    li.appendChild(text);
    statsListItemsElement.appendChild(li);
  }

  const computedEquivalence = computeEquivalenceFromStatsItem(stats);

  if (!pieChart) {
    pieChart = new Chartist.Pie('.ct-chart', {labels, series}, {
      donut: true,
      donutWidth: 60,
      donutSolid: true,
      startAngle: 270,
      showLabel: true
    });
  } else {
    pieChart.update({labels, series});
  }

  injectEquivalentIntoHTML(stats, computedEquivalence);
}

start = () => {
  chrome.runtime.sendMessage({ action: 'start' });

  hide(startButton);
  show(stopButton);
  show(analysisInProgressMessage);
  localStorage.setItem('analysisStarted', '1');
}

stop = () => {
  chrome.runtime.sendMessage({ action: 'stop' });

  hide(stopButton);
  show(startButton);
  hide(analysisInProgressMessage);
  clearInterval(statsInterval);
  localStorage.removeItem('analysisStarted');
}

openMoreResults = async () => {
  const url = chrome.runtime.getURL("/tab/tab.html");
  browser.tabs.create({url: url, active: true});
  window.close();
}

reset = () => {
  if (!confirm(translate('resetConfirmation'))) {
    return;
  }

  localStorage.removeItem('rawdata');
  localStorage.removeItem('duration');
  hide(statsElement);
  showStats();
  hide(resetButton);
}

init = () => {

  if ( getSelectedRegion() !== null ) {
    selectRegion.value = userLocation;
  }

  if (null === localStorage.getItem('rawdata')) {
    hide(resetButton);
  } else {
    show(resetButton);
  }

  showStats();

  if (null === localStorage.getItem('analysisStarted')) {
    return;
  }

  start();
  statsInterval = setInterval(showStats, 2000);
}

selectRegionHandler = (event) => {
  const selectedRegion = event.target.value;

  if ('' === selectedRegion) {
    return;
  }

  userLocation = selectedRegion;
  localStorage.setItem('selectedRegion', selectedRegion);
  showStats();
}

hide = element => element.classList.add('hidden');
show = element => element.classList.remove('hidden');

const analysisInProgressMessage = document.getElementById('analysisInProgressMessage');

const statsElement = document.getElementById('stats');

const statsMoreResults = document.getElementById('statsMoreResults');
statsMoreResults.addEventListener('click', openMoreResults);

const startButton = document.getElementById('startButton');
startButton.addEventListener('click', start);

const stopButton = document.getElementById('stopButton');
stopButton.addEventListener('click', stop);

const resetButton = document.getElementById('resetButton');
resetButton.addEventListener('click', reset);

const selectRegion = document.getElementById('selectRegion');
selectRegion.addEventListener('change', selectRegionHandler);

loadTranslations();

init();
