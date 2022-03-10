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
    view: { 
      statsElement: null,
      analysisInProgressMessage: null,
      init: function () {
        this.parent.start.view.init();
        this.parent.stop.view.init();
        this.parent.reset.view.init();
        this.statsElement = document.getElementById('stats');
        this.analysisInProgressMessage = document.getElementById('analysisInProgressMessage');
      },
      update: function () {

      },
    },
    stop: {
      run: function () {
        this.model.run();
        this.view.run();
      },
      model: {
        run: function () {
          chrome.runtime.sendMessage({ action: 'stop' });
          localStorage.removeItem('analysisStarted');
        },
        init: function () {

        },
        update: function () {

        }
      },
      view: {
        button: null,
        run: function () {
          hide(this.button);
          show(this.parent.parent.start.view.button);
          hide(this.parent.parent.view.analysisInProgressMessage);
          clearInterval(statsInterval);
        },
        init: function () {
          this.button = document.getElementById('stopButton');
          this.button.addEventListener('click', this.parent.run.bind(this.parent));
        },
        update: function () {

        }
      }
    },
    start: {
      run: function () {
        this.model.run();
        this.view.run();
      },
      model: {
        run: function () {
          chrome.runtime.sendMessage({ action: 'start' });
          localStorage.setItem('analysisStarted', '1');
        },
        init: function () {

        },
        update: function () {

        }
      },
      view: {
        button: null,
        run: function () {
          hide(this.button);
          show(this.parent.parent.stop.view.button);
          show(this.parent.parent.view.analysisInProgressMessage);
        },
        init: function () {
          this.button = document.getElementById('startButton');
          this.button.addEventListener('click', this.parent.run.bind(this.parent));
        },
        update: function () {

        }
      }
    },
    reset: {
      run: async function () {
        if (!confirm(translate('resetConfirmation'))) {
          return;
        }
        this.model.run();
        this.view.run();
      },
      model: {
        run: async function () {
          await localStorage.clear();
          chrome.runtime.sendMessage({action: "reinitCIUpdater"});
        },
        init: function () {

        },
        update: function () {

        }
      },
      view: {
        button: null,
        run: function () {
          hide(this.parent.parent.view.statsElement);
          showStats();
          hide(this.button);
        },
        init: function () {
          this.button = document.getElementById('resetButton');
          this.button.addEventListener('click', this.parent.run.bind(this.parent));
          if (null === localStorage.getItem('rawdata')) {
            hide(this.button);
          } else {
            show(this.button);
          }
        },
        update: function () {

        }
      }
    },
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

  show(popup.analysisCtrl.view.statsElement);
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

init = () => {

  popup.model.init();
  popup.view.init();

  showStats();

  if (null === localStorage.getItem('analysisStarted')) {
    return;
  }

  // Load regions from the storage.
  const parameters = getParameters();
  injectRegionIntoHTML(parameters.regions, parameters.selectedRegion);

  statsInterval = setInterval(showStats, 2000);
}

hide = element => element.classList.add('hidden');
show = element => element.classList.remove('hidden');

attachHandlerToSelectRegion();
loadTranslations();

init();
