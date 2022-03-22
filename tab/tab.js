oPrintDebug = printDebug
printDebug = (msg) => {
  oPrintDebug("tab: " + msg);
}
// Create a sum of data for all websites
// tsInterval in s
createSumOfData = (dataObject, type, tsInterval=60*10) => {
  tsInterval *= 1000;
  const rv = {};
  for(const origin in dataObject) {
    if ( dataObject[origin][type] === undefined ) {
      console.warn("Found undefined at dataObject[" + origin + "][" + type + "]")
      continue;
    }
    const keys = Object.keys(dataObject[origin][type].dots);
    for(const tso in dataObject[origin][type].dots ) {
      const originalTS = parseInt(tso);
      let ts = originalTS;
      const newTs = keys.find((a) => (ts-tsInterval) <= a && a <= (ts+tsInterval));
      if ( newTs !== undefined ) {
        ts = newTs;
      }
      if ( rv[ts] === undefined ) {
        rv[ts] = 0;
      }
      rv[ts] += dataObject[origin][type].dots[originalTS];
    }
  }
  return rv;
}

// create 0 data point when time ellapsed is too high
// assuming sod sorted
// ts in seconds
fillSODGaps = (sod, tsInterval=60*10) => {
  tsInterval *= 1000;
  let previous = undefined;
  const keys = Object.keys(sod).sort((a,b) => a > b);
  for(let ts of keys) {
    if (previous !== undefined) {
      const pratInterv = (ts - previous);
      if ( pratInterv > tsInterval ) {
        const newTs = parseInt(previous) + parseInt(Math.round(pratInterv/2));
        sod[newTs] = 0;
      }
    }
    previous = ts;
  }
}

// used to merge two sod (respecting interval constraint)
// ts in seconds
mergeTwoSOD = (sod1,sod2, tsInterval=60*10) => {
  tsInterval *= 1000;
  const keys = Object.keys(sod1);
  const result = Object.assign({}, sod1);
  for(let ts in sod2) {
    const tsOrigin = ts;
    const newTs = keys.find((a) => (ts-tsInterval) <= a && a <= (ts+tsInterval));
    if ( newTs !== undefined ) {
      ts = newTs;
    }
    if ( result[ts] === undefined ) {
      result[ts] = 0;
    } 
    result[ts] += sod2[tsOrigin];
  }
  return result;
}

// create an object containing sum of data
createObjectFromSumOfData = (sod) => {
  const rv = [];
  for(let ts in sod) {
    rv.push({x: parseInt(ts), y: parseInt(sod[ts])});
  }
  return rv;
}

// create moving average from the sum of datas (ordered)
// tsInterval number of seconds of interval
createMovingAverage = (sod, tsInterval=10) => {
  let avgSum = 0;         // sum for average
  const dots = [];        // dots for the graph
  const stackedSums = []; // stack of sums

  for(let obj of sod) {
    let ts = obj.x;
    const cmp = ts - tsInterval;
    avgSum += obj.y;
    stackedSums.push(obj);

    while(stackedSums[0].x < cmp) {
      avgSum -= stackedSums.shift().y;
    }

    dots.push({x: ts, y: (avgSum/(stackedSums[stackedSums.length-1].x-stackedSums[0].x))});
  }
  return dots;
}

const LAST_UPDATE_DATA = "lastDataUpdate";
/**
 * This holds all the data from the storage
 * on the fly compute data.
 */
const tab = {
  stats: null,
  parameters: null,
  rawdata: null,

  init: async function () {
    await this.model.init();
    await this.view.init();
  },
  update: async function () {
    await this.model.update();
    await this.view.update();
  },
  /**
   * Responsible from update stats object.
   */
  updateStats: async function () {
    if ( this.stats == null 
      || (Date.now() - this.stats[LAST_UPDATE_DATA]) > (await getPref("tab.update.minMs")) 
      ) {
      this.stats = await getStats();
      this.stats[LAST_UPDATE_DATA] = Date.now();
    }
  },

  /**
   * Responsible from update stats object.
   */
  updateParameters: async function () {
    if ( this.parameters == null 
      || (Date.now() - this.parameters[LAST_UPDATE_DATA]) > (await getPref("tab.update.minMs")) 
      ) {
      this.parameters = await getParameters();
      this.parameters[LAST_UPDATE_DATA] = Date.now();
    }
  },

  /**
   * Responsible from update stats object.
   */
  updateRawData: async function () {
    if ( this.rawdata == null 
      || (Date.now() - this.rawdata[LAST_UPDATE_DATA]) > (await getPref("tab.update.minMs")) 
      ) {
      this.rawdata = await getOrCreateRawData();
      this.rawdata[LAST_UPDATE_DATA] = Date.now();
    }
  },

  /**
   * Update regions data.
   */
  updateRegions: async function () {
    if ( this.parameters == null ) {
      return await updateParameters();
    } else {
      if ( this.parameters.regions == null 
        || (Date.now() - this.parameters.regions[LAST_UPDATE_DATA]) > (await getPref("tab.update.minMs")) 
        ) {
          this.parameters.regions = await getRegions();
          this.parameters.regions[LAST_UPDATE_DATA] = Date.now();
      }
    }
  },
  /**
   * Show same results as the popup.
   */
  results: {
    /**
     * Equivalence in smartphone charged, kilometers by car.
     */
    equivalence: {
      model: {
        init: async function () {
          await this.parent.parent.parent.updateStats();
        },
        update: async function () {
          await this.parent.parent.parent.updateStats();
        }
      },
      view: {
        init: async function () {
          await updateEquivalence(this.parent.parent.parent.stats);
        },
        update: async function () {
          await updateEquivalence(this.parent.parent.parent.stats);
        }
      }
    }, 
    /**
     * Detailled view of electricity consumption during browsing.
     */
    detailledView: {
      model: {
        init: async function () {
          const root = this.parent.parent.parent;
          await root.updateStats();
          await root.updateRawData();
        },
        update: async function () {
          const root = this.parent.parent.parent;
          await root.updateStats();
          await root.updateRawData();
        }
      },
      view: {
        /**
         * Create or update an entry in the detailled view.
         * @param {*} stat stat to insert / update.
         * @param {*} topResults tbody to insert in.
         * @param {*} init force creation.
         */
        createEntry: function (stat, topResults, init) {
          const root = this.parent.parent.parent;

          let foundValue = false;
          if ( ! init ) {
            for(const row of topResults.children) {
              if ( 1 < row.children.length ) {
                if ( row.children[1].textContent == stat.origin ) {
                  foundValue = true;
                  row.children[0].textContent = stat.percent;
                  row.children[2].textContent = toMegaByteNoRound(root.rawdata[stat.origin].datacenter.total);
                  row.children[3].textContent = toMegaByteNoRound(root.rawdata[stat.origin].network.total + root.rawdata[stat.origin].datacenter.total);
                }
              }
            }
          }

          if ( init || ! foundValue) {
            const tr = document.createElement("tr");
            const percent = document.createElement("td");
            const site = document.createElement("td");
            const data = document.createElement("td");
            const network = document.createElement("td");
            tr.className = "oneResult";
            percent.textContent = stat.percent;
            site.textContent = stat.origin;
            data.textContent = toMegaByteNoRound(root.rawdata[stat.origin].datacenter.total);
            network.textContent = toMegaByteNoRound(root.rawdata[stat.origin].network.total + root.rawdata[stat.origin].datacenter.total);
            tr.appendChild(percent);
            tr.appendChild(site);
            tr.appendChild(data);
            tr.appendChild(network);
            topResults.appendChild(tr);
          }
        },
        init: async function () {
          const root = this.parent.parent.parent;
          const topResults = document.getElementById("topResults");
          for(let i = 0; i < root.stats.highestStats.length; i ++) {
            this.createEntry(root.stats.highestStats[i], topResults, true);
          }

          // Add some sorters
          $(document).ready(function() {
            $('#topResultsTable').DataTable();
            document.getElementById("topResultsTable_wrapper").style.width = "100%";
          });
        },
        update: async function () {
          const root = this.parent.parent.parent;
          const topResults = document.getElementById("topResults");
          for(let i = 0; i < root.stats.highestStats.length; i ++) {
            this.createEntry(root.stats.highestStats[i], topResults, false);
          }
        }
      }
    }
  },
  /**
   * Parametrize the system.
   */
  settings: {
    selectRegion: {
      model: {
        selectedRegion: null,
        init: async function () {
          await this.update();
        },
        update: async function () {
          await this.parent.parent.parent.updateParameters();
          this.selectedRegion = await getSelectedRegion();
        }
      },
      view: {
        init: async function () {
          const settings = this.parent.parent;
          // part of the refresh system
          $("#carbonIntensityLastRefreshForceRefresh").click(async function() {
            obrowser.runtime.sendMessage({action: "forceCIUpdater"});
          });
          const root = this.parent.parent.parent;
          injectRegionIntoHTML(root.parameters.regions, this.parent.model.selectedRegion);
        },
        update: async function () {
          const root = this.parent.parent.parent;
          $("#" + regionSelectID).empty();
          injectRegionIntoHTML(root.parameters.regions, this.parent.model.selectedRegion);
        }
      }
    },
    updateCarbonIntensity: {
      model: {
        init: async function () {
          const root = this.parent.parent.parent;
          await root.updateParameters();
        },
        update: async function () {
          const root = this.parent.parent.parent;
          await root.updateParameters();
        }
      },
      view: {
        div: null,
        init: async function () {
          div = document.getElementById("carbonIntensityLastRefreshIP");
          await this.update();
        },
        update: async function () {
          const root = this.parent.parent.parent;
          div.textContent = obrowser.i18n.getMessage('settingsLastRefresh', [new Date(root.parameters.lastRefresh).toLocaleString()]);
        }
      }
    }, 
    carbonIntensityView: {
      model: {
        init: async function () {
          await this.parent.parent.parent.updateRegions();
        },
        update: async function () {
          await this.parent.parent.parent.updateRegions();
        }
      },
      view: {
        settingsCICIS: null,
        /**
         * Create a new entry in region table.
         * @param {*} root root for creation of entry.
         * @param {*} settingsCICIS HTML div for settings.
         * @param {*} name key in object array.
         * @param {*} init true if in initial creation.
         */
        createEntry: function (settingsCICIS, name, init, newIntensity) {
          const root = this.parent.parent.parent;
          let region = translate("region" + capitalizeFirstLetter(name));
          if ( region === "" || region === null ) {
            region = name;
          }
          let foundValue = false;

          if ( ! init ) {
            for(const row of settingsCICIS.children) {
              if( 1 < row.children.length ) {
                if ( row.children[0].textContent == region ) {
                  foundValue = true;
                  row.children[1].textContent = newIntensity;
                }
              }
            }
          }

          if ( init || ! foundValue) {
            const row = document.createElement("tr");
            const country = document.createElement("td");
            country.textContent = region;
            const ci = document.createElement("td");
            ci.textContent = root.parameters.regions[name].carbonIntensity;
            row.append(country);
            row.append(ci);
            row.style.textAlign = "center";
            row.style.verticalAlign = "middle";
            settingsCICIS.append(row);
          }
        },
        init: async function () {
          const root = this.parent.parent.parent;
          this.settingsCICIS = document.getElementById("settingsCICIS");
          for(const name in root.parameters.regions) {
            this.createEntry(this.settingsCICIS, name, true, null);
          }
          $(document).ready(function() {
            const table = $('#settingsCItable');
            table.DataTable();
            document.getElementById("settingsCItable_wrapper").style.width = "100%";
          });
        },
        update: async function () {
          const root = this.parent.parent.parent;
          for(const name in root.parameters.regions) {
            this.createEntry(this.settingsCICIS, name, false, root.parameters.regions[name].carbonIntensity);
          }
        }
      }
    },
    preferencesScreen: {
      view: {
        init: async function() {
          await injectPreferencesIntoHTML("prefsTableTBODY");
          document.getElementById("tab_settings_preferencesScreen_validateButton").addEventListener("click", async function(){
            const prefs = await getOrCreatePreferences();
            for(const row of document.getElementById("prefsTableTBODY").children) {
              let value = row.children[1].children[0].value;
              if ( typeof(value) === "string" ) {
                try {
                  const res = JSON.parse(value);
                  if ( typeof(res) !== "string" ) {
                    value = res;
                  }
                } catch(error) {
                  // do nothing
                }
              }
              IPIPrecurse(prefs, row.children[0].textContent, value);
            }
            await obrowser.storage.local.set({pref: JSON.stringify(prefs)});
          });
        },
        update: async function() {
          $("#prefsTableTBODY").empty();
          await injectPreferencesIntoHTML("prefsTableTBODY");
        }
      }
    }
  }, 
  /**
   * View history of results.
   */
  history: {
    model: {
      bytesDataCenterObjectForm: null,
      bytesNetworkObjectForm: null,
      createObject: async function () {
        const root = this.parent.parent;
        await root.updateRawData();
        const bytesDataCenterUnordered = createSumOfData(root.rawdata, 'datacenter', 60);
        let bytesNetworkUnordered = createSumOfData(root.rawdata, 'network', 60);
        bytesNetworkUnordered = mergeTwoSOD(bytesDataCenterUnordered, bytesNetworkUnordered);
        fillSODGaps(bytesNetworkUnordered);
        fillSODGaps(bytesDataCenterUnordered);
        this.bytesDataCenterObjectForm = createObjectFromSumOfData(bytesDataCenterUnordered).sort((a,b) => a.x > b.x);
        this.bytesNetworkObjectForm = createObjectFromSumOfData(bytesNetworkUnordered).sort((a,b) => a.x > b.x);
      },
      init: async function () {
        this.createObject();
        await this.parent.data.model.init();
        await this.parent.electricityConsumptionOverTime.model.init();
      },
      update: async function () {
        this.createObject();
        await this.parent.data.model.init();
        await this.parent.electricityConsumptionOverTime.model.init();
      }
    },
    /**
     * Data usage view.
     */
    data: {
      /**
       * Data consumption over time.
       */
      consumptionOverTime: {
        view: {
          data: null,
          config: null,
          myChart: null,
          createData: async function () {
            const parent = this.parent.parent.parent;
            return {
              datasets: [
                {
                  label: translate("tab_history_data_consumptionOverTime_datacenterLabel"),
                  data: parent.model.bytesDataCenterObjectForm,
                  borderColor: 'rgb(255, 0, 0)',
                  showLine: true,
                  lineTension: 0.2,
                },
                {
                  label: translate("tab_history_data_consumptionOverTime_networkLabel"),
                  data: parent.model.bytesNetworkObjectForm,
                  borderColor: 'rgb(0, 255, 0)',
                  showLine: true,
                  lineTension: 0.2
                }
              ]
            };
          },
          init: async function () {
            const parent = this.parent.parent.parent;
            this.data = await this.createData();

            const data = this.data;
            this.config = {
              type: 'line',
              data: data,
              options: {
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  title: {
                    display: true,
                    text: translate('historyChartTitle')
                  },
                  decimation: {
                    enabled: true,
                    algorithm: 'lttb',
                    //samples: 5,
                    threshold: 10
                  },
                  zoom: {
                    zoom: {
                      wheel: {
                        enabled: true,
                      },
                      drag: {
                        enabled: true
                      },
                      mode: 'x',
                    }
                  }
                  
                },
                scales: {
                  x: {
                    title: {
                      display: true,
                      text: translate('historyChartXAxis')
                    }, 
                    type: 'time'
                  },
                  y: {
                      title: {
                        display: true,
                        text: translate('historyChartYAxis')
                      },
                      ticks: {
                          callback: function(value, index, ticks) {
                              return toMegaByteNoRound(value);
                          }
                      }
                  }
                }
              },
            };
          
            this.myChart = new Chart(
              document.getElementById('historyDivCanvas'),
              this.config
            );
          },
          update: async function () {
            const parent = this.parent.parent.parent;
            this.myChart.data = await this.createData();
            this.data = this.myChart.data;
            this.config.data = this.myChart.data;
            this.myChart.update();
          }
        }
      },
      /**
       * Data consumption among sites.
       */
      consumptionShareAmongSites: {
        model: {
          topStats: null,
          labels: null,
          series: null,
          init: async function () {
            this.topStats = await getStats(100);
            this.labels = [];
            this.series = [];
            for (const stat of this.topStats.highestStats) {
              if (stat.percent < 1) {
                continue;
              }

              this.labels.push(stat.origin);
              this.series.push(stat.percent);
            }
          },
          update: async function () {
            await this.init();
          }
        },
        view: {
          CHART_COLORS: {
            red: 'rgb(255, 99, 132)',
            orange: 'rgb(255, 159, 64)',
            yellow: 'rgb(255, 205, 86)',
            green: 'rgb(75, 192, 192)',
            blue: 'rgb(54, 162, 235)',
            purple: 'rgb(153, 102, 255)',
            grey: 'rgb(201, 203, 207)'
          },
          pieData: null,
          pieConfig: null,
          chart: null,
          createData: async function () {
            const parent = this.parent;
            return {
              labels: parent.model.labels,
              datasets: [{
                label: translate("tab_history_data_consumptionShareAmongSites_sitesShareDatasetLabel"),
                data: parent.model.series,
                backgroundColor: Object.values(this.CHART_COLORS)
              }]
            };
          },
          init: async function () {
            this.pieData = await this.createData();
            
            this.pieConfig = {
              type: 'pie',
              data: this.pieData
            };
          
            this.chart = new Chart(
              document.getElementById('historyPieCanvas'),
              this.pieConfig
            );
          },
          update: async function () {
            this.chart.data = await this.createData();
            this.pieData = this.chart.data;
            this.pieConfig.data = this.chart.data;
            this.chart.update();
          }
        }
      },
    },
    electricityConsumptionOverTime: {
      model: {
        electricityDataCenterObjectForm: null,
        electricityNetworkObjectForm: null,
        init: async function () {
          const history = this.parent.parent;
          console.warn("bytes per origin is not updated at the time (only electricity)...");
          this.electricityDataCenterObjectForm = [];
          this.electricityNetworkObjectForm = [];
          for(let o of history.model.bytesDataCenterObjectForm) {
            this.electricityDataCenterObjectForm.push({x: o.x, y: o.y * kWhPerByteDataCenter});
          }
          for(let o of history.model.bytesNetworkObjectForm) {
            this.electricityNetworkObjectForm.push({x: o.x, y: o.y * kWhPerByteNetwork});
          }
        },
        update: async function () {
          await this.init();
        }
      },
      view: {
        data: null,
        config: null,
        chart: null,
        createData: async function () {
          const parent = this.parent;
          return {
            datasets: [
              {
                label: translate("tab_history_electricityConsumptionOverTime_datasetDataCenter"),
                data: parent.model.electricityDataCenterObjectForm,
                borderColor: 'rgb(255, 0, 0)',
                showLine: true,
                lineTension: 0.2,
              },
              {
                label: translate("tab_history_electricityConsumptionOverTime_datasetNetwork"),
                data: parent.model.electricityNetworkObjectForm,
                borderColor: 'rgb(0, 255, 0)',
                showLine: true,
                lineTension: 0.2,
              }
            ]
          };
        },
        init: async function () {
          this.data = await this.createData();

          const data = this.data;
          this.config = {
            type: 'line',
            data: data,
            options: {
              responsive: true,
              plugins: {
                legend: {
                  position: 'top',
                },
                title: {
                  display: true,
                  text: translate("tab_history_electricityConsumptionOverTime_graphTitle")
                },
                decimation: {
                  enabled: true,
                  algorithm: 'lttb',
                  //samples: 5,
                  threshold: 10
                },
                zoom: {
                  zoom: {
                    wheel: {
                      enabled: true,
                    },
                    drag: {
                      enabled: true
                    },
                    mode: 'x',
                  }
                }
                
              },
              scales: {
                x: {
                  title: {
                    display: true,
                    text: translate("tab_history_electricityConsumptionOverTime_graphXAxis")
                  }, 
                  type: 'time'
                },
                y: {
                    title: {
                      display: true,
                      text: translate("tab_history_electricityConsumptionOverTime_graphYAxis")
                    }
                }
              }
            },
          };

          // Create electricity graph
          this.chart = new Chart(
            document.getElementById('historyElectricityDivCanvas'),
            this.config
          );
        },
        update: async function () {
          this.data = await this.createData();
          this.config.data = this.data;
          this.chart.data = this.data;
          this.chart.update();
        }
      }
    }
  }
}

createMVC(tab);
attachParent(tab);

// Animation button of refresh
let currentDeg = 0;
const minimalNoticeableMs = 40;
const animDurationMs = 500;
const steps = Math.round(animDurationMs/minimalNoticeableMs);
const degPerStep = 360 / steps;
const animateButton = $("#refreshButton > img");

animateRotationButton = async (done) => {
  currentDeg += degPerStep;
  if (currentDeg >= 360 ) {
    currentDeg = 0;

  } 
  animateButton.rotate(currentDeg);
  if ( currentDeg > 0 ) {
    setTimeout(animateRotationButton, minimalNoticeableMs, done);
  } else {
    await tab.update();
  }
}

let lastUpdate = null;
let lock = false;
/**
 * decide what to do with input orders.
 */
async function handleMessage(o) {
  if ( lock ) {
    return;
  }
  lock = true;
  if (o.action == "view-refresh") {
    printDebug("Refresh data in the tab");
    await tab.update();
  }
  lock = false;
}

handlePreferencesChanged = async (changes, areaName) => {
  if ( areaName == "local" ) {
    if ( changes["pref"] !== undefined ) {
      tab.settings.model.update();
      tab.settings.view.update();
      $("#refreshButton").off("click");
      if ( await getPref("tab.animate") ) {
        $("#refreshButton").on("click", animateRotationButton);
      } else {
        $("#refreshButton").on("click", async () => {{
          await tab.update();
        }});
      }
    }
  }
}

init = async () => {

  obrowser.runtime.onMessage.addListener(handleMessage);
  window.addEventListener("unload", end);

  attachHandlerToSelectRegion();
  loadTranslations();

  await tab.init();

  // Animation button of refresh
  if ( await getPref("tab.animate") ) {
    $("#refreshButton").on("click", animateRotationButton);
  } else {
    $("#refreshButton").on("click", async () => {{
      await tab.update();
    }});
  }
  obrowser.storage.onChanged.addListener(handlePreferencesChanged);
}

end = () => {
  obrowser.runtime.onMessage.removeListener(handleMessage);
  obrowser.storage.onChanged.removeListener(handlePreferencesChanged);
  window.removeEventListener("load", init);
  window.removeEventListener("unload", end);
}

window.addEventListener("load", init);
