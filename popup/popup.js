const LAST_UPDATE_DATA = "lastDataUpdate";
const popup = {
 statsData: null,
 statsData5: null,
  /**
   * Responsible from update stats object.
   */
  updateStats: async function () {
    if ( this.statsData == null  
      || (Date.now() - this.statsData[LAST_UPDATE_DATA]) > (await getPref("tab.update.minMs")) 
      ) {
        this.statsData = await getStats();
        this.statsData5 = await getStats(5);
        this.statsData[LAST_UPDATE_DATA] = Date.now();
    }
  },
  init: async function () {
    await this.model.init();
    await this.view.init();
  },
  update: async function () {
    await this.model.update();
    await this.view.update();
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
          obrowser.runtime.sendMessage({ action: 'stop' });
          await obrowser.storage.local.remove('analysisRunning');
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
          if ( (await obrowser.storage.local.get("analysisRunning")).analysisRunning == 1 ) {
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
          obrowser.runtime.sendMessage({ action: 'start' });
          await obrowser.storage.local.set({analysisRunning: 1});
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
          if ( (await obrowser.storage.local.get("analysisRunning")).analysisRunning == 1 ) {
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
        await this.parent.parent.view.update();
      },
      model: {
        run: async () => {
          await obrowser.storage.local.clear();
          obrowser.runtime.sendMessage({action: "stop"});
          obrowser.runtime.sendMessage({action: "reinitCIUpdater"});
        },
        init: async function () {

        },
        update: async function () {

        }
      },
      view: {
        button: null,
        init: async function () {
          this.button = document.getElementById('resetButton');
          this.button.addEventListener('click', this.parent.run.bind(this.parent));
          await this.update();
        },
        update: async function () {
          if ((await obrowser.storage.local.get("rawdata")).rawdata === undefined) {
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
    model: {
      init: async function() {
        await this.update();
      },
      update: async function() {
        await this.parent.parent.updateStats();
      }
    },
    view: {
      statsInterval: null,
      pieChart: null,
      element: null,
      init: async function () {
        const statsMoreResults = document.getElementById('statsMoreResults');
        statsMoreResults.addEventListener('click', this.parent.openMoreResults);
        this.element = document.getElementById('stats');
        const labels = [], series = [];
        this.pieChart = new Chartist.Pie('.ct-chart', {labels, series}, {
          donut: true,
          donutWidth: 60,
          donutSolid: true,
          startAngle: 270,
          showLabel: true
        });
        await this.update();
      },
      update: async function () {
        const root = this.parent.parent;
        if (root.statsData5.total === 0) {
          return;
        }
      
        show(root.stats.view.element);
        const labels = [];
        const series = [];
      
        const statsListItemsElement = document.getElementById('statsListItems');
        while (statsListItemsElement.firstChild) {
          statsListItemsElement.removeChild(statsListItemsElement.firstChild);
        }
      
        for (let index in root.statsData5.highestStats) {
          if (root.statsData5.highestStats[index].percent < 1) {
            continue;
          }
      
          labels.push(root.statsData5.highestStats[index].origin);
          series.push(root.statsData5.highestStats[index].percent);
          const text = document.createTextNode(`${root.statsData5.highestStats[index].percent}% ${root.statsData5.highestStats[index].origin}`);
          const li = document.createElement("LI");
          li.appendChild(text);
          statsListItemsElement.appendChild(li);
        }

        this.pieChart.update({labels, series});

        if ( (await obrowser.storage.local.get("rawdata")).rawdata === undefined ) {
          hide(this.element);
        } else {
          show(this.element);
        }
      }
    },
    openMoreResults: async () => {
      const url = obrowser.runtime.getURL("/tab/tab.html");
      obrowser.tabs.create({url: url, active: true});
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
    computedEquivalence: null,
    model: {
      init: async function() {
        await this.update();
      },
      update: async function() {
        const root = this.parent.parent;
        await root.updateStats();
        this.parent.computedEquivalence = await computeEquivalenceFromStatsItem(root.statsData);
      }
    },
    view: {
      init: async function() {
        await this.update();
      },
      update: async function() {
        const root = this.parent.parent;
        await injectEquivalentIntoHTML(root.statsData, this.parent.computedEquivalence);
      }
    }
  },
  /**
   * Footer with legal notice
   */
  footer: {

  }
};

/**
 * listen for modification of storage.
 */
onStorageChanged = async (changes, areaName) => {
  if ( areaName === "local" ) {
    popup.update();
  }
}

init = async () => {

  createMVC(popup);
  attachParent(popup);
  
  loadTranslations();

  window.removeEventListener("load", init);
  window.addEventListener("unload", end, { once: true });

  popup.init();
  obrowser.storage.onChanged.addListener(onStorageChanged);
}

end = () => {

}

window.addEventListener("load", init);