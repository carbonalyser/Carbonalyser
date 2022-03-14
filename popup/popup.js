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
      analysisInProgressMessage: null,
      init: async function () {
        await this.parent.start.view.init();
        await this.parent.stop.view.init();
        await this.parent.reset.view.init();
        this.analysisInProgressMessage = document.getElementById('analysisInProgressMessage');
      }
    },
    stop: {
      run: async function () {
        await this.model.run();
        await this.parent.view.update();
      },
      model: {
        run: async () => {
          getBrowser().runtime.sendMessage({ action: 'stop' });
          await getBrowser().storage.local.remove('analysisRunning');
        },
        init: async function () {

        },
        update: async function () {

        }
      },
      view: {
        button: null,
        init: async function () {
          this.button = document.getElementById('stopButton');
          this.button.addEventListener('click', this.parent.run.bind(this.parent));
          if ( (await getBrowser().storage.local.get("analysisRunning")).analysisRunning == 1 ) {
            show(this.button);
          } else {
            hide(this.button);
          }
        },
        update: async function () {
          await this.init();
        }
      }
    },
    start: {
      run: async function () {
        await this.model.run();
        await this.parent.view.update();
      },
      model: {
        run: async () => {
          getBrowser().runtime.sendMessage({ action: 'start' });
          await getBrowser().storage.local.set({analysisRunning: 1});
        },
        init: async function () {

        },
        update: async function () {

        }
      },
      view: {
        button: null,
        init: async function () {
          this.button = document.getElementById('startButton');
          this.button.addEventListener('click', this.parent.run.bind(this.parent));
          if ( (await getBrowser().storage.local.get("analysisRunning")).analysisRunning == 1 ) {
            hide(this.button);
          } else {
            show(this.button);
          }
        },
        update: async function () {
          await this.init();
        }
      }
    },
    reset: {
      run: async function () {
        if (!confirm(translate('resetConfirmation'))) {
          return;
        }
        await this.model.run();
        await this.view.run();
        await this.parent.parent.view.update();
      },
      model: {
        run: async () => {
          await getBrowser().storage.local.clear();
          getBrowser().runtime.sendMessage({action: "stop"});
          getBrowser().runtime.sendMessage({action: "reinitCIUpdater"});
        },
        init: async function () {

        },
        update: async function () {

        }
      },
      view: {
        button: null,
        run: async () => {
          await showStats();
        },
        init: async function () {
          this.button = document.getElementById('resetButton');
          this.button.addEventListener('click', this.parent.run.bind(this.parent));
          await this.update();
        },
        update: async function () {
          if ((await getBrowser().storage.local.get("rawdata")) === undefined) {
            hide(this.button);
          } else {
            show(this.button);
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
      init: async function () {
        const statsMoreResults = document.getElementById('statsMoreResults');
        statsMoreResults.addEventListener('click', this.parent.openMoreResults);
        this.element = document.getElementById('stats');
        await this.update();
      },
      update: async function () {
        if ( (await getBrowser().storage.local.get("rawdata")) === undefined ) {
          hide(this.element);
        } else {
          show(this.element);
        }
      }
    },
    openMoreResults: async () => {
      const url = getBrowser().runtime.getURL("/tab/tab.html");
      getBrowser().tabs.create({url: url, active: true});
      window.close();
    }
  },
  /**
   * Select the region in popup
   */
  region: {
    model: {
      selectedRegion: null,
      regions: null,
      init: async function () {
        await this.update();
      },
      update: async function () {
        this.selectedRegion = await getSelectedRegion();
        this.regions = await getRegions();
      }
    },
    view: {
      init: async function () {
        attachHandlerToSelectRegion();
        injectRegionIntoHTML(this.parent.model.regions, this.parent.model.selectedRegion);
      }, 
      update: async function () {
        const select = document.getElementById(regionSelectID);
        while (select.firstChild) {
          select.removeChild(select.firstChild);
        }
        injectRegionIntoHTML(this.parent.model.regions, this.parent.model.selectedRegion);
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

showStats = async () => {
  const stats = await getStats(5);

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

  const computedEquivalence = await computeEquivalenceFromStatsItem(stats);

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

init = async () => {

  await popup.model.init();
  await popup.view.init();

  await showStats();

  if (undefined === (await getBrowser().storage.local.get('analysisRunning'))) {
    return;
  }

}

loadTranslations();

init();


getBrowser().runtime.onMessage.addListener(async function (o) {
  if (o.action == "view-refresh") {
    if ( isInDebug() ) { 
      console.warn("Refresh data in the popup");
    }
    await popup.model.update();
    await popup.view.update();
    await showStats(); // should be removed
  }
});