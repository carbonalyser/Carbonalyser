let statsInterval;
let pieChart;

const popup = {
  /**
   * Header with project title and more information.
   */
  header: {

  },
  /**
   * Some buttons to control analysis.
   */
  analysisCtrl: {
    start: () => {
      chrome.runtime.sendMessage({ action: 'start' });
    
      hide(startButton);
      show(stopButton);
      show(analysisInProgressMessage);
      localStorage.setItem('analysisStarted', '1');
    }
  },
  /**
   * Part responsible from stats show.
   */
  stats: {
    view: {
      init: function () {
        const statsMoreResults = document.getElementById('statsMoreResults');
        statsMoreResults.addEventListener('click', this.parent.openMoreResults);
      },
      update: function () {

      }
    },
    openMoreResults: async () => {
      const url = chrome.runtime.getURL("/tab/tab.html");
      browser.tabs.create({url: url, active: true});
      window.close();
    }
  },
  /**
   * Select the region in popup
   */
  region: {

  },
  /**
   * Show equivalence (more human understandable)
   */
  equivalence: {

  },
  /**
   * Footer with legal notice
   */
  footer: {

  }
};

createMVC(popup);
attachParent(popup);

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

stop = () => {
  chrome.runtime.sendMessage({ action: 'stop' });

  hide(stopButton);
  show(startButton);
  hide(analysisInProgressMessage);
  clearInterval(statsInterval);
  localStorage.removeItem('analysisStarted');
}

reset = async () => {
  if (!confirm(translate('resetConfirmation'))) {
    return;
  }

  await localStorage.clear();
  chrome.runtime.sendMessage({action: "reinitCIUpdater"});
  hide(statsElement);
  showStats();
  hide(resetButton);
}

init = () => {

  popup.model.init();
  popup.view.init();

  if (null === localStorage.getItem('rawdata')) {
    hide(resetButton);
  } else {
    show(resetButton);
  }

  showStats();

  if (null === localStorage.getItem('analysisStarted')) {
    return;
  }

  // Load regions from the storage.
  const parameters = getParameters();
  injectRegionIntoHTML(parameters.regions, parameters.selectedRegion);

  popup.analysisCtrl.start();
  statsInterval = setInterval(showStats, 2000);
}

hide = element => element.classList.add('hidden');
show = element => element.classList.remove('hidden');

const analysisInProgressMessage = document.getElementById('analysisInProgressMessage');

const statsElement = document.getElementById('stats');

const startButton = document.getElementById('startButton');
startButton.addEventListener('click', popup.analysisCtrl.start);

const stopButton = document.getElementById('stopButton');
stopButton.addEventListener('click', stop);

const resetButton = document.getElementById('resetButton');
resetButton.addEventListener('click', reset);

attachHandlerToSelectRegion();
loadTranslations();

init();
