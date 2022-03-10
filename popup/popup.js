
const popup = {
  view: {
    init: function () {
      this.parent.header.view.init();
      this.parent.analysisCtrl.view.init();
      this.parent.stats.view.init();
      this.parent.region.view.init();
      this.parent.equivalence.view.init();
      this.parent.footer.view.init();
    },
    update: function () {
      this.parent.header.view.update();
      this.parent.analysisCtrl.view.update();
      this.parent.stats.view.update();
      this.parent.region.view.update();
      this.parent.equivalence.view.update();
      this.parent.footer.view.update();
    }
  },
  /**
   * 
   * @returns true is there is else false.
   */
  didAnalysisDataAvaliable: () => {
    return !(localStorage.getItem('rawdata') === null);
  },

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
      analysisInProgressMessage: null,
      init: function () {
        this.parent.start.view.init();
        this.parent.stop.view.init();
        this.parent.reset.view.init();
        this.analysisInProgressMessage = document.getElementById('analysisInProgressMessage');
      },
      update: function () {
        this.parent.start.view.update();
        this.parent.stop.view.update();
        this.parent.reset.view.update();
      }
    },
    stop: {
      run: function () {
        this.model.run();
        this.parent.view.update();
      },
      model: {
        run: () => {
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
        init: function () {
          this.button = document.getElementById('stopButton');
          this.button.addEventListener('click', this.parent.run.bind(this.parent));
          if ( localStorage.getItem("analysisStarted") == 1 ) {
            show(this.button);
          } else {
            hide(this.button);
          }
        },
        update: function () {
          this.init();
        }
      }
    },
    start: {
      run: function () {
        this.model.run();
        this.parent.view.update();
      },
      model: {
        run: () => {
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
        init: function () {
          this.button = document.getElementById('startButton');
          this.button.addEventListener('click', this.parent.run.bind(this.parent));
          if ( localStorage.getItem("analysisStarted") == 1 ) {
            hide(this.button);
          } else {
            show(this.button);
          }
        },
        update: function () {
          this.init();
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
        this.parent.parent.view.update();
      },
      model: {
        run: async () => {
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
          showStats();
        },
        init: function () {
          this.button = document.getElementById('resetButton');
          this.button.addEventListener('click', this.parent.run.bind(this.parent));
          this.update();
        },
        update: function () {
          if (this.parent.parent.parent.didAnalysisDataAvaliable()) {
            show(this.button);
          } else {
            hide(this.button);
          }
        }
      }
    },
  },
  /**
   * Part responsible from stats show.
   */
  stats: {
    view: {
      statsInterval: null,
      pieChart: null,
      element: null,
      init: function () {
        const statsMoreResults = document.getElementById('statsMoreResults');
        statsMoreResults.addEventListener('click', this.parent.openMoreResults);
        this.element = document.getElementById('stats');
        this.update();
      },
      update: function () {
        if ( this.parent.parent.didAnalysisDataAvaliable() ) {
          hide(this.element);
        } else {
          show(this.element);
        }
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
    model: {
      parameters: null,
      init: function () {
        this.parameters = getParameters();
      },
      update: function () {
        this.parameters = getParameters();
      }
    },
    view: {
      init: function () {
        attachHandlerToSelectRegion();
        injectRegionIntoHTML(this.parent.model.parameters.regions, this.parent.model.parameters.selectedRegion);
      }, 
      update: function () {
        while (parent.firstChild) {
          parent.removeChild(parent.firstChild);
        }
        injectRegionIntoHTML(this.parent.model.parameters.regions, this.parent.model.parameters.selectedRegion);
      }
    }
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

  show(popup.stats.view.element);
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

  if (!popup.stats.view.pieChart) {
    popup.stats.view.pieChart = new Chartist.Pie('.ct-chart', {labels, series}, {
      donut: true,
      donutWidth: 60,
      donutSolid: true,
      startAngle: 270,
      showLabel: true
    });
  } else {
    popup.stats.view.pieChart.update({labels, series});
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

  popup.stats.view.statsInterval = setInterval(showStats, 2000);
}

loadTranslations();

init();
