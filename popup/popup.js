const LAST_UPDATE_DATA = "lastDataUpdate";
const popup = {
  stats: null,
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
        },
      },
      view: {
        button: null,
        init: async function () {
          this.button = document.getElementById('stopButton');
          this.button.addEventListener('click', this.parent.run.bind(this.parent));
          if ( (await storageGetAnalysisState()) == 1 ) {
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
          if ( (await storageGetAnalysisState()) == 1 ) {
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
          const pref = (await obrowser.storage.local.get()).pref;
          await obrowser.storage.local.clear();
          await obrowser.storage.local.set({pref: pref});
          await obrowser.runtime.sendMessage({action: "stop"});
          await obrowser.runtime.sendMessage({action: "reinitCIUpdater"});
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
  statsView: {
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
        if (root.stats.stats.highestStats.total === 0) {
          return;
        }
      
        show(root.statsView.view.element);
        const labels = [];
        const series = [];
      
        const statsListItemsElement = document.getElementById('statsListItems');
        while (statsListItemsElement.firstChild) {
          statsListItemsElement.removeChild(statsListItemsElement.firstChild);
        }
      
        const top5 = root.stats.stats.highestStats.slice(0, 5);
        for (let index in top5) {
          if (top5[index].percent < 1) {
            continue;
          }
      
          labels.push(top5[index].origin);
          series.push(top5[index].percent);
          const text = document.createTextNode(`${top5[index].percent}% ${top5[index].origin}`);
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
    view: {
      init: async function() {
        const root = this.parent.parent;
        await injectEquivalentIntoHTML(root.stats.stats, root.stats.equivalence);
        document.getElementById("kWhTotalUnit").textContent = (await getPref("general.electricityUnit"));
      },
      update: async function() {
        await this.init();
      }
    }
  },
  /**
   * Footer with legal notice
   */
  footer: {

  }
};

let storageChangedTimeout = null;
storageChangedTimeoutCall = () => {
  popup.update();
  storageChangedTimeout = null;
}
/**
 * listen for modification of storage.
 */
onStorageChanged = async (changes, areaName) => {
  if ( areaName === "local" ) {
    if ( storageChangedTimeout != null ) {
      clearTimeout(storageChangedTimeout);
    }

    if ( changes["stats"] !== undefined ) {
      popup.stats = await getOrCreateStats();
    }

    if ( changes["rawdata"] !== undefined ) {
      if ( await getPref("popup.update.auto_refresh") ) {
        storageChangedTimeout = setTimeout(storageChangedTimeoutCall, 100);
      }
    } else {
      storageChangedTimeout = setTimeout(storageChangedTimeoutCall, 100);
    }
  }
}

P_init = async () => {

  createMVC(popup);
  attachParent(popup);
  
  loadTranslations();

  window.removeEventListener("load", P_init);
  window.addEventListener("unload", end, { once: true });

  popup.stats = await getOrCreateStats();
  popup.init();
  obrowser.storage.onChanged.addListener(onStorageChanged);
}

end = () => {

}

window.addEventListener("load", P_init);