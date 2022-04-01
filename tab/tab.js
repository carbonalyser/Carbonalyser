
printDebug = (msg) => {
  printDebugOrigin("tab: " + msg);
}

// Create a sum of data for all websites
// tsInterval in s
createSumOfData = (dataObject, type, tsInterval=60*10) => {
  tsInterval *= 1000;
  const rv = {};
  for(const origin in dataObject) {
    if ( dataObject[origin][type] === undefined ) {
      printDebug("Found undefined at dataObject[" + origin + "][" + type + "]")
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
      || (Date.now() - this.stats[LAST_UPDATE_DATA]) > (await getPref("general.update.storageFetchMs")) 
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
      || (Date.now() - this.parameters[LAST_UPDATE_DATA]) > (await getPref("general.update.storageFetchMs")) 
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
      || (Date.now() - this.rawdata[LAST_UPDATE_DATA]) > (await getPref("general.update.storageFetchMs")) 
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
        || (Date.now() - this.parameters.regions[LAST_UPDATE_DATA]) > (await getPref("general.update.storageFetchMs")) 
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
        data: {
          selectedRegion: null,
        },
        init: async function () {
          await this.update();
        },
        update: async function () {
          await this.parent.parent.parent.updateParameters();
          this.data.selectedRegion = await getSelectedRegion();
        }
      },
      view: {
        data: {
          img: null,
          imgAnimation: null,
        },
        init: async function () {
          const settings = this.parent.parent;
          const img = document.createElement("img");
          this.data.img = img;
          img.setAttribute("width", "20px");
          img.setAttribute("height", "20px");
          img.setAttribute("style", "margin-left: 5px;");
          img.setAttribute("src", await obrowser.runtime.getURL("/img/refresh.png"));
          img.hidden = true;
          const imgAnimation = rotateAnimation.newInstance();
          this.data.imgAnimation = imgAnimation;
          imgAnimation.button = $(img);
          imgAnimation.loop = true;
          this.data.imgAnimation.onAnimationEnd = async function () {
            img.hidden = true;
          };
          // part of the refresh system
          const div = $("#carbonIntensityLastRefreshForceRefresh");
          div.click(async function() {
            const dateNow = Date.now();
            obrowser.runtime.sendMessage({action: "forceCIUpdater"});
            if ( await getPref("tab.animate") ) {
              img.hidden = false;
              imgAnimation.start();
              const interval = setInterval(async function() {
                const parametersSTO = await obrowser.storage.local.get("parameters");
                const parametersSTR = parametersSTO.parameters;
                if ( parametersSTR !== undefined ) {
                  const parameters = JSON.parse(parametersSTR);
                  if ( parameters.lastRefresh !== undefined ) {
                    if ( dateNow < parameters.lastRefresh ) {
                      imgAnimation.loop = false;
                      clearInterval(interval);
                    } else {

                    }
                  }
                }
              }, 1000);
            }
          });
          div.append(img);
          const root = this.parent.parent.parent;
          injectRegionIntoHTML(root.parameters.regions, this.parent.model.data.selectedRegion);
        },
        update: async function () {
          const root = this.parent.parent.parent;
          $("#" + regionSelectID).empty();
          injectRegionIntoHTML(root.parameters.regions, this.parent.model.data.selectedRegion);
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
        data: {
          div: null,
        },
        init: async function () {
          this.data.div = document.getElementById("carbonIntensityLastRefreshIP");
          await this.update();
        },
        update: async function () {
          const root = this.parent.parent.parent;
          this.data.div.textContent = obrowser.i18n.getMessage('settingsLastRefresh', [new Date(root.parameters.lastRefresh).toLocaleString()]);
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
        data: {
          settingsCICIS: null,
        },
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
          this.data.settingsCICIS = document.getElementById("settingsCICIS");
          for(const name in root.parameters.regions) {
            this.createEntry(this.data.settingsCICIS, name, true, null);
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
            this.createEntry(this.data.settingsCICIS, name, false, root.parameters.regions[name].carbonIntensity);
          }
        }
      }
    },
    carbonFactorManual: {
      view: {
        data: {
          button: null,
          input: null,
        },
        init: async function() {
          this.data.button = $("#tab_custom_ci_factor_button");
          this.data.input = $("#tab_custom_ci_factor_input");
          const input = this.data.input;
          this.data.button.on("click", async function() {
            await setCarbonIntensityRegion("custom", parseInt(input.val()));
          });
        },
        update: async function() {

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
      data: {
        bytesDataCenterObjectForm: null,
        bytesNetworkObjectForm: null,
      },
      createObject: async function () {
        const root = this.parent.parent;
        await root.updateRawData();
        const bytesDataCenterUnordered = createSumOfData(root.rawdata, 'datacenter', 60);
        let bytesNetworkUnordered = createSumOfData(root.rawdata, 'network', 60);
        bytesNetworkUnordered = mergeTwoSOD(bytesDataCenterUnordered, bytesNetworkUnordered);
        fillSODGaps(bytesNetworkUnordered);
        fillSODGaps(bytesDataCenterUnordered);
        this.data.bytesDataCenterObjectForm = createObjectFromSumOfData(bytesDataCenterUnordered).sort((a,b) => a.x > b.x);
        this.data.bytesNetworkObjectForm = createObjectFromSumOfData(bytesNetworkUnordered).sort((a,b) => a.x > b.x);
      },
      init: async function () {
        this.createObject();
        await this.parent.data.model.init();
        await this.parent.electricity.model.init();
        await this.parent.attention.model.init();
      },
      update: async function () {
        this.createObject();
        await this.parent.data.model.update();
        await this.parent.electricity.model.update();
        await this.parent.attention.model.update();
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
          data: {
            data: null,
            config: null,
            myChart: null,
          },
          createData: async function () {
            const parent = this.parent.parent.parent;
            return {
              datasets: [
                {
                  label: translate("tab_history_data_consumptionOverTime_datacenterLabel"),
                  data: parent.model.data.bytesDataCenterObjectForm,
                  borderColor: 'rgb(255, 0, 0)',
                  showLine: true,
                  lineTension: 0.2,
                },
                {
                  label: translate("tab_history_data_consumptionOverTime_networkLabel"),
                  data: parent.model.data.bytesNetworkObjectForm,
                  borderColor: 'rgb(0, 255, 0)',
                  showLine: true,
                  lineTension: 0.2
                }
              ]
            };
          },
          init: async function () {
            const parent = this.parent.parent.parent;
            this.data.data = await this.createData();

            const data = this.data.data;
            this.data.config = {
              type: 'line',
              data: data,
              options: {
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  title: {
                    display: false,
                    text: translate('tab_history_data_consumptionOverTime_title')
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
          
            this.data.myChart = new Chart(
              document.getElementById('tab_history_data_consumptionOverTime_canvas'),
              this.data.config
            );
          },
          update: async function () {
            const newdata = await this.createData();
            let clearDetected = false;
            for(let idataset = 0; idataset < 2; idataset = idataset + 1) {
              if ( newdata.datasets[idataset].data.length < this.data.myChart.data.datasets[idataset].data.length ) {
                clearDetected = true;
                break;
              } else {
                for(let i = this.data.myChart.data.datasets[idataset].data.length; i < newdata.datasets[idataset].data.length; i = i + 1) {
                  this.data.myChart.data.datasets[idataset].data.push(newdata.datasets[idataset].data[i]);
                }
              }
            }
            if ( clearDetected ) {
              this.data.myChart.destroy();
              await this.init();
            } else {
              this.data.myChart.update();
            }
          }
        }
      },
      /**
       * Data consumption among sites.
       */
      consumptionShareAmongSites: {
        model: {
          data: {
            topStats: null,
            labels: null,
            series: null,
          },
          init: async function () {
            this.data.topStats = await getStats(100);
            this.data.labels = [];
            this.data.series = [];
            for (const stat of this.data.topStats.highestStats) {
              if (stat.percent < 1) {
                continue;
              }

              this.data.labels.push(stat.origin);
              this.data.series.push(stat.percent);
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
          data: {
            dataIndex: null, // origin/index pair match
            pieData: null,
            pieConfig: null,
            chart: null,
          },
          createData: async function () {
            const parent = this.parent;
            this.data.dataIndex = {};
            for(const i in parent.model.data.labels) {
              this.data.dataIndex[parent.model.data.labels[i]] = i;
            }
            return {
              labels: parent.model.data.labels,
              datasets: [{
                label: translate("tab_history_data_consumptionShareAmongSites_sitesShareDatasetLabel"),
                data: parent.model.data.series,
                backgroundColor: Object.values(this.CHART_COLORS)
              }]
            };
          },
          init: async function () {
            const pieData = await this.createData();
            this.data.pieData = pieData;
            this.data.pieConfig = {
              type: 'pie',
              data: pieData,
              options: {
                responsive: false,
                plugins: {
                  legend: {
                    display: false
                  }
                }
              }
            };
          
            this.data.chart = new Chart(
              document.getElementById('tab_history_data_consumptionShareAmongSites_canvas'),
              this.data.pieConfig
            );
          },
          update: async function () {
            for(let i = 0; i < this.parent.model.data.labels.length; i = i + 1) {
              const label = this.parent.model.data.labels[i];
              const idx = this.data.dataIndex[label];
              if ( idx === undefined ) {
                const newKey = this.data.pieData.datasets[0].data.length;
                this.data.pieData.labels.push(label);
                this.data.pieData.datasets[0].data.push(this.parent.model.data.series[i]);
                this.data.dataIndex[label] = newKey;
              } else {
                this.data.pieData.datasets[0].data[idx] = this.parent.model.data.series[i];
              }
            }
            this.data.chart.update();
          }
        }
      },
    },
    electricity: {
      overTime: {
        model: {
          data: {
            electricityDataCenterObjectForm: null,
            electricityNetworkObjectForm: null,
          },
          init: async function () {
            const history = this.parent.parent.parent;
            printDebug("bytes per origin is not updated at the time (only electricity)...");
            this.data.electricityDataCenterObjectForm = [];
            this.data.electricityNetworkObjectForm = [];
            for(let o of history.model.data.bytesDataCenterObjectForm) {
              this.data.electricityDataCenterObjectForm.push({x: o.x, y: o.y * kWhPerByteDataCenter});
            }
            for(let o of history.model.data.bytesNetworkObjectForm) {
              this.data.electricityNetworkObjectForm.push({x: o.x, y: o.y * kWhPerByteNetwork});
            }
          },
          update: async function () {
            await this.init();
          }
        },
        view: {
          data: {
            data: null,
            config: null,
            chart: null,
          },
          createData: async function () {
            const parent = this.parent;
            return {
              datasets: [
                {
                  label: translate("tab_history_electricity_overTime_datasetDataCenter"),
                  data: parent.model.data.electricityDataCenterObjectForm,
                  borderColor: 'rgb(255, 0, 0)',
                  showLine: true,
                  lineTension: 0.2,
                },
                {
                  label: translate("tab_history_electricity_overTime_datasetNetwork"),
                  data: parent.model.data.electricityNetworkObjectForm,
                  borderColor: 'rgb(0, 255, 0)',
                  showLine: true,
                  lineTension: 0.2,
                }
              ]
            };
          },
          init: async function () {
            this.data.data = await this.createData();
  
            const data = this.data.data;
            this.data.config = {
              type: 'line',
              data: data,
              options: {
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  title: {
                    display: false
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
                      text: translate("tab_history_electricity_overTime_graphXAxis")
                    }, 
                    type: 'time'
                  },
                  y: {
                      title: {
                        display: true,
                        text: translate("tab_history_electricity_overTime_graphYAxis")
                      }
                  }
                }
              },
            };
  
            // Create electricity graph
            this.data.chart = new Chart(
              document.getElementById('tab_history_electricity_overTime_canvas'),
              this.data.config
            );
          },
          update: async function () {
            const newdata = await this.createData();
            let deletionDetected = false;
            for(let idataset = 0; idataset < 2; idataset = idataset + 1) {
              if ( newdata.datasets[idataset].data.length < this.data.chart.data.datasets[idataset].data.length ) {
                deletionDetected = true;
                break;
              } else {
                for(let i = this.data.chart.data.datasets[idataset].data.length; i < newdata.datasets[idataset].data.length; i = i + 1) {
                  this.data.chart.data.datasets[idataset].data.push(newdata.datasets[idataset].data[i]);
                }
              }
            }
            if ( deletionDetected ) {
              this.data.chart.destroy();
              await this.init();
            } else {
              this.data.chart.update();
            }
          }
        }
      },
    },
    attention: {
      time: {
        view: {
          data: {
            data: null,
            config: null,
            chart: null,
            dataIndex: null, // origin/index
          },
          CHART_COLORS: {
            red: 'rgb(255, 99, 132)',
            orange: 'rgb(255, 159, 64)',
            yellow: 'rgb(255, 205, 86)',
            green: 'rgb(75, 192, 192)',
            blue: 'rgb(54, 162, 235)',
            purple: 'rgb(153, 102, 255)',
            grey: 'rgb(201, 203, 207)'
          },
          createData: async function () {
            const rawdata = await getOrCreateRawData();
            const labels = [];
            const data = [];
            for(const origin in rawdata) {
              if ( (await getPref("tab.min_attention_time")) < rawdata[origin].attentionTime ) {
                labels.push(origin);
                data.push(rawdata[origin].attentionTime);
              }
            }
            return {
              labels: labels,
              datasets: [{
                label: translate("tab_history_attention_time_canvas_x_axis"),
                data: data,
                backgroundColor: Object.values(this.CHART_COLORS)
              }]
            };
          },
          init: async function () {
            const data = await this.createData();
            this.data.data = data;
            this.data.dataIndex = {};
            for(let i = 0; i < data.labels.length; i = i + 1) {
              this.data.dataIndex[data.labels[i]] = i;
            }
            this.data.config = {
              type: 'bar',
              data: data,
              options: {
                plugins: {
                  legend: {
                    position: 'top',
                    display: false
                  },
                  title: {
                    display: false
                  }
                },
                scales: {
                  x: {
                    title: {
                      display: true,
                      text: translate('tab_history_attention_time_canvas_x_axis')
                    }
                  },
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: translate('tab_history_attention_time_canvas_y_axis')
                    },
                    ticks: {
                      callback: function(value, index, ticks) {
                          return ((value / 1000) / 60).toFixed(2);
                      }
                    }
                  }
                }
              },
            };
            this.data.chart = new Chart(
              document.getElementById('tab_history_attention_time_canvas'),
              this.data.config
            );
          },
          update: async function () {
            const newdata = await this.createData();
            let nkeys = Object.keys(this.data.dataIndex).length;
            if ( nkeys <= newdata.labels.length ) {
              for(let i = 0; i < newdata.labels.length; i = i + 1) {
                const origin = newdata.labels[i];
                if ( this.data.dataIndex[origin] === undefined ) {
                  this.data.dataIndex[origin] = nkeys;
                  this.data.chart.data.labels.push(origin);
                  nkeys += 1;
                }
                const idx = this.data.dataIndex[origin];
                this.data.chart.data.datasets[0].data[idx] = newdata.datasets[0].data[i];
              }
              this.data.chart.update();
            } else {
              this.data.chart.destroy();
              await this.init();
            }
          }
        }
      },
      efficiency: {
        model: {
          data: {
            labels: null,
            data: null,
          },
          init: async function () {
            const rawdata = await getOrCreateRawData();
            this.data.labels = [];
            this.data.data = [];
            for(const origin in rawdata) {
              const o = rawdata[origin];
              const od = o.datacenter.total;
              const on = o.network.total;
              if ( rawdata[origin] !== undefined && (await getPref("tab.min_attention_time")) < rawdata[origin].attentionTime  ) {
                this.data.labels.push(origin);
                this.data.data.push(rawdata[origin].attentionTime / (od + on));
              }
            }
          },
          update: async function () {
            await this.init();
          }
        },
        view: {
          data: {
            dataIndex: null,
            data: null,
            config: null,
            chart: null,
          },
          CHART_COLORS: {
            red: 'rgb(255, 99, 132)',
            orange: 'rgb(255, 159, 64)',
            yellow: 'rgb(255, 205, 86)',
            green: 'rgb(75, 192, 192)',
            blue: 'rgb(54, 162, 235)',
            purple: 'rgb(153, 102, 255)',
            grey: 'rgb(201, 203, 207)'
          },
          init: async function () {
            const parent = this.parent;
            this.data.dataIndex = {};
            for(const i in parent.model.data.labels) {
              const origin = parent.model.data.labels[i];
              this.data.dataIndex[origin] = parseInt(i);
            }
            const data = {
              labels: parent.model.data.labels,
              datasets: [{
                data: parent.model.data.data,
                backgroundColor: Object.values(this.CHART_COLORS)
              }]
            };
            this.data.data = data;
            this.data.config = {
              type: 'bar',
              data: data,
              options: {
                plugins: {
                  legend: {
                    position: 'top',
                    display: false
                  },
                  title: {
                    display: false
                  }
                },
                scales: {
                  x: {
                    title: {
                      display: true,
                      text: translate('tab_history_attention_efficiency_x_axis')
                    }
                  },
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: translate('tab_history_attention_efficiency_y_axis')
                    }
                  }
                }
              },
            };
            this.data.chart = new Chart(
              document.getElementById('tab_history_attention_efficiency_canvas'),
              this.data.config
            );
          },
          update: async function () {
            const parent = this.parent;
            let len = Object.keys(this.data.dataIndex).length;
            if ( len <= parent.model.data.labels.length ) {
              for(const i in parent.model.data.labels) {
                const origin = parent.model.data.labels[i];
                if ( this.data.dataIndex[origin] === undefined ) {
                  this.data.dataIndex[origin] = parseInt(len);
                  this.data.chart.data.labels.push(origin);
                  len += 1;
                }
                this.data.chart.data.datasets[0].data[this.data.dataIndex[origin]] = parent.model.data.data[i];
              }
              this.data.chart.update();
            } else {
              this.data.chart.destroy();
              await this.init();
            }
          }
        },
      }
    }
  }
}

createMVC(tab);
attachParent(tab);

animateRotationButton = async (done) => {
  const a = rotateAnimation.newInstance();
  a.button = $("#refreshButton > img");
  a.start();
}

let lastUpdate = null;
let storageChangedTimeout = null;

/**
 * Prevent storage changed flood during call.
 */
storageChangedTimeoutCall = () => {
  printDebug("Refresh data in the tab");
  tab.update();
  storageChangedTimeout = null;
}

handleStorageChanged = async (changes, areaName) => {
  if ( areaName == "local" ) {
    if ( storageChangedTimeout != null ) {
      clearTimeout(storageChangedTimeout);
    }
    if ( changes["pref"] !== undefined ) {
      $("#refreshButton").off("click");
      if ( await getPref("tab.animate") ) {
        $("#refreshButton").on("click", animateRotationButton);
      } else {
        $("#refreshButton").on("click", async () => {{
          await tab.update();
        }});
      }
    } 
    if ( changes["rawdata"] !== undefined ) {
      if ( await getPref("tab.update.auto_refresh") ) {
        storageChangedTimeout = setTimeout(storageChangedTimeoutCall, 100);
      }
    } else {
      storageChangedTimeout = setTimeout(storageChangedTimeoutCall, 100);
    }
  }
}

T_init = async () => {

  window.removeEventListener("load", T_init);
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

  obrowser.storage.onChanged.addListener(handleStorageChanged);
}

end = () => {
  obrowser.storage.onChanged.removeListener(handleStorageChanged);
  window.removeEventListener("unload", end);
}
window.addEventListener("load", T_init);
