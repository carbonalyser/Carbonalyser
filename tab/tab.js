
printDebug = (msg) => {
  printDebugOrigin("tab: " + msg);
}

/**
 * search for a given row in dtt.
 */
DTTsearchEntry = (dtt, matcher, updateOnFound) => {
  let foundValue = false;
  const childrens = dtt.rows()[0];
  for(let j = 0; j < childrens.length; j = j + 1) {
    const rowId = childrens[j];
    const row = dtt.row(rowId);
    let rowData = row.data();
    if ( rowData !== undefined && rowData !== null && matcher(rowData) ) {
      foundValue = true;
      rowData = updateOnFound(row,rowData);
      break;
    }
  }
  return foundValue;
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
      view: {
        init: async function () {
          await injectEquivalentIntoHTML(this.parent.parent.parent.stats.stats, this.parent.parent.parent.stats.equivalence);
          document.getElementById("kWhTotalUnit").textContent = (await getPref("general.electricityUnit"));
        },
        update: async function () {
          await this.init();
        }
      }
    },
    /**
     * Export results of analysis.
     */
    export: {
      view: {
        run: async function (rawdata) {
          const date = new Date();
          const select = document.getElementById("results_export_select");
          const selectedData = select.options[select.selectedIndex];
          const selectedOptionId = selectedData.id;
          const results_export_format_select = document.getElementById("results_export_format_select");
          const results_export_origin_input = document.getElementById("results_export_origin_input");
          const selectedFormat = results_export_format_select.options[results_export_format_select.selectedIndex];
          const fileformat = selectedFormat.getAttribute("fileFormat");
          const fname = translate(selectedOptionId + "_prefix") + "_" + date.getHours() + "h" + date.getMinutes() + "_" + date.getDay() + "_" + date.getMonth() + "_" + date.getFullYear();

          await compileAndDownload(rawdata,selectedOptionId.replace("results_export_option_",""),fname,fileformat,results_export_origin_input.value,(await obrowser.tabs.getCurrent()).incognito);
        },
        init: async function () {
          const root = this.parent.parent.parent;
          const button = document.getElementById("results_export_export_button");
          button.addEventListener("click", () => {
            this.run(root.rawdata);
          });
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
          await root.updateRawData();
        },
        update: async function () {
          const root = this.parent.parent.parent;
          await root.updateRawData();
        }
      },
      view: {
        data: {
          dtt: null
        },
        /**
         * Compute average ecoindex from a given origin (site).<br />
         * A better system would be by frequency of use of each url.<br />
         */
        getAverageEcoIndex: function(ecoindexData) {
          let avg = 0, ecoindexDataLen = 0;
          for(const url in ecoindexData) {
            const keys = Object.keys(ecoindexData[url]);
            if ( 0 < keys.length ) {
              const current = ecoindexData[url][keys[keys.length-1]];
              if ( current == -1 ) {
              
              } else {
                avg += current;
                ecoindexDataLen += 1;
              }
            }
          }
          if ( ecoindexDataLen === 0 ) {
            return -1;
          } else {
            return avg / ecoindexDataLen;
          }
        },
        /**
         * Create or update an entry in the detailled view.
         * @param {*} stat stat to insert / update.
         * @param {*} topResults tbody to insert in.
         * @param {*} init force creation.
         */
        createEntry: function (stat, init) {
          const root = this.parent.parent.parent;

          let foundValue = false;
          if ( ! init ) {
            foundValue = DTTsearchEntry(this.data.dtt, 
              (rowData) => rowData[1] === stat.origin, 
              (row,rowData) => {
                const dataOrigin = root.rawdata[stat.origin];

                rowData[0] = stat.percent;
                rowData[2] = toMegaByteNoRound(dataOrigin.datacenter.total);
                rowData[3] = toMegaByteNoRound(dataOrigin.network.total + dataOrigin.datacenter.total);
                rowData[4] = this.getAverageEcoIndex(dataOrigin.ecoindex);
                row.data(rowData).draw();
                return rowData;
              }
              );
          }

          if ( (init || ! foundValue) ) {
            const tr = document.createElement("tr");
            const percent = document.createElement("td");
            const site = document.createElement("td");
            const data = document.createElement("td");
            const network = document.createElement("td");
            const ecoindex = document.createElement("td");
            const dataOrigin = root.rawdata[stat.origin];
            tr.className = "oneResult";

            percent.textContent = stat.percent;
            site.textContent = stat.origin;
            data.textContent = toMegaByteNoRound(dataOrigin.datacenter.total);
            network.textContent = toMegaByteNoRound(dataOrigin.network.total + dataOrigin.datacenter.total);
            ecoindex.textContent = this.getAverageEcoIndex(dataOrigin.ecoindex);

            tr.appendChild(percent);
            tr.appendChild(site);
            tr.appendChild(data);
            tr.appendChild(network);
            tr.appendChild(ecoindex);
            this.data.dtt.row.add(tr).draw();
          }
        },
        init: async function () {
          // Add some sorters
          $(document).ready(() => {
            this.data.dtt = $('#topResultsTable').DataTable({
              language: {
                  url: getDatatableTranslation()
              },
              columns: [
                { data: 0 },
                {   
                  data: 1,
                  render: function (data) {
                       return '<a href="https://' + data + '/" target="_blank">' + data + '</a>';
                 }
                },
                { data: 2 },
                { data: 3 },
                { data: 4 }
              ]
            });
            this.data.dtt.on("init", function() {
              document.getElementById("topResultsTable_wrapper").style.width = "100%";
            });
            
            const root = this.parent.parent.parent;
            for(let i = 0; i < root.stats.stats.highestStats.length; i ++) {
              this.createEntry(root.stats.stats.highestStats[i], true);
            }
          });
        },
        update: async function () {
          const root = this.parent.parent.parent;
          if ( root.stats.stats.highestStats.length == 0 ) {
            this.data.dtt.clear().draw();
          } else {
            for(let i = 0; i < root.stats.stats.highestStats.length; i ++) {
              this.createEntry(root.stats.stats.highestStats[i], false);
            }
          }
        }
      }
    }
  },
 /**
   * View history of results.
   */
  history: {
    model: {
      createObject: async function () {
        
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
            parent: null,
            data: null,
            config: null,
            myChart: null,
          },
          createData: async function () {
            const parent = this.parent.parent.parent;
            const root = this.parent.parent.parent.parent;
            return {
              datasets: [
                {
                  label: translate("tab_history_data_consumptionOverTime_datacenterLabel"),
                  data: root.stats.bytesDataCenterObjectForm,
                  borderColor: 'rgb(255, 0, 0)',
                  showLine: true,
                  lineTension: 0.2,
                },
                {
                  label: translate("tab_history_data_consumptionOverTime_networkLabel"),
                  data: root.stats.bytesNetworkObjectForm,
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
                parsing: false,
                locale: translate("general_number_format"),
                resizeDelay: await getPref("tab.update.resize_delay"),
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
            parent: null,
            labels: null,
            series: null,
          },
          init: async function () {
            const topStats = (await getStats()).highestStats.slice(0, 100);
            this.data.labels = [];
            this.data.series = [];
            for (const stat of topStats) {
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
          data: {
            CHART_COLORS: [
              'rgb(255, 99, 132)', // red
              'rgb(255, 159, 64)', // orange
              'rgb(255, 205, 86)', // yellow
              'rgb(75, 192, 192)', // green
              'rgb(54, 162, 235)', // blue
              'rgb(153, 102, 255)', // purple
              'rgb(201, 203, 207)' // grey
            ],
            parent: null,
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
                backgroundColor: this.data.CHART_COLORS
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
                locale: translate("general_number_format"),
                resizeDelay: await getPref("tab.update.resize_delay"),
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
            if ( this.parent.model.data.labels.length < this.data.pieData.labels.length ) {
              this.data.chart.destroy();
              await this.init();
            } else {
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
        }
      },
    },
    electricity: {
      overTime: {
        view: {
          data: {
            parent: null,
            data: null,
            config: null,
            chart: null,
          },
          createData: async function () {
            const root = this.parent.parent.parent.parent;
            return {
              datasets: [
                {
                  label: translate("tab_history_electricity_overTime_datasetDataCenter"),
                  data: root.stats.electricityDataCenterObjectForm,
                  borderColor: 'rgb(255, 0, 0)',
                  showLine: true,
                  lineTension: 0.2,
                },
                {
                  label: translate("tab_history_electricity_overTime_datasetNetwork"),
                  data: root.stats.electricityNetworkObjectForm,
                  borderColor: 'rgb(0, 255, 0)',
                  showLine: true,
                  lineTension: 0.2,
                }
              ]
            };
          },
          init: async function () {
            this.data.data = await this.createData();
  
            
            
            const electricityUnit = await getElectricityModifier();
            const data = this.data.data;
            this.data.config = {
              type: 'line',
              data: data,
              options: {
                locale: translate("general_number_format"),
                resizeDelay: await getPref("tab.update.resize_delay"),
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
                      text: obrowser.i18n.getMessage('tab_history_electricity_overTime_graphYAxis', [await getPref("general.electricityUnit")])
                    },
                    ticks: {
                      callback: function(value, index, ticks) {
                        return (value * electricityUnit).toFixed(5);
                      }
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
            parent: null,
            data: null,
            config: null,
            chart: null,
            dataIndex: null, // origin/index
            CHART_COLORS: [
              'rgb(255, 99, 132)',  // red
              'rgb(255, 159, 64)',  // orange
              'rgb(255, 205, 86)',  // yellow
              'rgb(75, 192, 192)',  // green
              'rgb(54, 162, 235)',  // blue
              'rgb(153, 102, 255)', // purple
              'rgb(201, 203, 207)'  // grey
            ],
          },
          createData: async function () {
            const root = this.parent.parent.parent.parent;
            return {
              labels: root.stats.attention.time.labels,
              datasets: [{
                label: translate("tab_history_attention_time_canvas_x_axis"),
                data: root.stats.attention.time.data,
                backgroundColor: this.data.CHART_COLORS
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
                locale: translate("general_number_format"),
                resizeDelay: await getPref("tab.update.resize_delay"),
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
        view: {
          data: {
            parent: null,
            dataIndex: null,
            data: null,
            config: null,
            chart: null,
            CHART_COLORS: [
              'rgb(255, 99, 132)', // red
              'rgb(255, 159, 64)', // orange
              'rgb(255, 205, 86)', // yellow
              'rgb(75, 192, 192)', // green
              'rgb(54, 162, 235)', // blue
              'rgb(153, 102, 255)', // purple
              'rgb(201, 203, 207)' // grey
            ],
          },
          init: async function () {
            const root = this.parent.parent.parent.parent;
            this.data.dataIndex = {};
            for(const i in root.stats.attention.efficiency.labels) {
              const origin = root.stats.attention.efficiency.labels[i];
              this.data.dataIndex[origin] = parseInt(i);
            }
            const data = {
              labels: root.stats.attention.efficiency.labels,
              datasets: [{
                data: root.stats.attention.efficiency.data,
                backgroundColor: this.data.CHART_COLORS
              }]
            };
            this.data.data = data;
            this.data.config = {
              type: 'bar',
              data: data,
              options: {
                locale: translate("general_number_format"),
                resizeDelay: await getPref("tab.update.resize_delay"),
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
            const root = this.parent.parent.parent.parent;
            const parent = this.parent;
            let len = Object.keys(this.data.dataIndex).length;
            if ( len <= root.stats.attention.efficiency.labels.length ) {
              for(const i in root.stats.attention.efficiency.labels) {
                const origin = root.stats.attention.efficiency.labels[i];
                if ( this.data.dataIndex[origin] === undefined ) {
                  this.data.dataIndex[origin] = parseInt(len);
                  this.data.chart.data.labels.push(origin);
                  len += 1;
                }
                this.data.chart.data.datasets[0].data[this.data.dataIndex[origin]] = root.stats.attention.efficiency.data[i];
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
  },
  prediction: {
    prediction: {
      view: {
        data: {
          days: 365
        },
        div: null,
        divGlobalPop: null,
        init: async function() {
          const _this = this;
          this.div = document.getElementById("tab_prediction_prediction_description");
          this.divGlobalPop = document.getElementById("tab_prediction_prediction_global_pop");
          document.getElementById("tab_prediction_prediction_button").addEventListener("click", () => {
            _this.data.days = parseInt(document.getElementById("tab_prediction_prediction_input").value);
            _this.update();
          });
          await this.update();
        },
        update: async function() {
          const root = this.parent.parent.parent;
          const yearCompare = await getPref("tab.forecast.compareYear.value");
          const yearCompareElectricityTWh = await getPref("tab.forecast.compareYear.electricity.total.TWh");
          const yearCompareElectricityTeckPercent = await getPref("tab.forecast.compareYear.electricity.teck.percent");
          const yearCompareElectricityTechTWh = yearCompareElectricityTWh * yearCompareElectricityTeckPercent;
          const dayRateKWh = root.stats.forecast.dayRateKWh;
          const days = this.data.days;
          const forecastedKWh = dayRateKWh * days;
          const people = (await getPref("general.population.number"));
          const percentInternet = await getPref("general.population.internetPercent");
          const peopleInternet = people * percentInternet;
          const extrapolateTWhPeopleInternet = (forecastedKWh * peopleInternet) / 1000000000;
          this.div.textContent = obrowser.i18n.getMessage('tab_prediction_prediction_description', [forecastedKWh.toFixed(5), days, dayRateKWh.toFixed(5)]);
          this.divGlobalPop.textContent = obrowser.i18n.getMessage('tab_prediction_prediction_global_pop', [peopleInternet, days, extrapolateTWhPeopleInternet.toFixed(1), (percentInternet * 100).toFixed(1), yearCompare, yearCompareElectricityTWh, (yearCompareElectricityTeckPercent * 100).toFixed(1), yearCompareElectricityTechTWh]);
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
          parent: null,
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
          parent: null,
          img: null,
          imgAnimation: null,
          selectRegion: null
        },
        /**
         * Inject regions in the select region chooser.
         * @param regions regions to which display their names.
         * @param selectedRegion currently selected region for instance 'regionChina'.
         */
        injectRegionIntoHTML: function (regions, selectedRegion) {
          this.data.selectRegion = document.getElementById('selectRegion');
          for(const name in regions) {
            const opt = document.createElement("option");
            opt.value = name;
            const translated = translate(name);
            opt.text = (translated === '') ? name : translated;
            this.data.selectRegion.add(opt);
          }
          if( selectedRegion !== '' && selectedRegion !== null ) {
              this.data.selectRegion.value = selectedRegion;
          }
        },
        init: async function () {
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
          this.injectRegionIntoHTML(root.parameters.regions, this.parent.model.data.selectedRegion);
          this.data.selectRegion.addEventListener('change', async (event) => {
            const selectedRegion = event.target.value;
            if ('' === selectedRegion) {
              return;
            }
          
            await setSelectedRegion(selectedRegion);
          });
        },
        update: async function () {
          const root = this.parent.parent.parent;
          $(this.data.selectRegion).empty();
          this.injectRegionIntoHTML(root.parameters.regions, this.parent.model.data.selectedRegion);
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
          parent: null,
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
          parent: null,
          settingsCICIS: null,
          dtt: null
        },
        /**
         * Create a new entry in region table.
         * @param {*} root root for creation of entry.
         * @param {*} settingsCICIS HTML div for settings.
         * @param {*} name key in object array.
         * @param {*} init true if in initial creation.
         */
        createEntry: function (name, init, regionObject) {
          const root = this.parent.parent.parent;
          let region = translate(name);
          if ( region === "" || region === null ) {
            region = name;
          }
          let foundValue = false;

          if ( ! init ) {
            foundValue = DTTsearchEntry(this.data.dtt, 
              (rowData) => rowData[0] === region, 
              (row,rowData) => {
                rowData[1] = regionObject.carbonIntensity;
                row.data(rowData).draw();
                return rowData;
              }
            );
          }

          if ( init || ! foundValue) {
            const row = document.createElement("tr");
            const country = document.createElement("td");
            country.textContent = region;
            const ci = document.createElement("td");
            ci.textContent = regionObject.carbonIntensity;
            row.append(country);
            row.append(ci);
            row.style.textAlign = "center";
            row.style.verticalAlign = "middle";
            this.data.dtt.row.add(row).draw();
          }
        },
        init: async function () {
          const root = this.parent.parent.parent;
          this.data.settingsCICIS = document.getElementById("settingsCICIS");
          $(document).ready(() => {
            const table = $('#settingsCItable');
            const dtt = table.DataTable({
              language: {
                  url: getDatatableTranslation()
              }
            });
            dtt.on("init", function() {
              document.getElementById("settingsCItable_wrapper").style.width = "100%";
            });
            this.data.dtt = dtt;
            for(const name in root.parameters.regions) {
              this.createEntry(name, true, root.parameters.regions[name]);
            }
          });
        },
        update: async function () {
          const root = this.parent.parent.parent;
          for(const name in root.parameters.regions) {
            this.createEntry(name, false, root.parameters.regions[name]);
          }
        }
      }
    },
    carbonFactorManual: {
      view: {
        data: {
          parent: null,
          button: null,
          input: null,
        },
        init: async function() {
          this.data.button = $("#tab_custom_ci_factor_button");
          this.data.input = $("#tab_custom_ci_factor_input");
          const input = this.data.input;
          this.data.button.on("click", async function() {
            await setCarbonIntensityRegion("regionCustom", parseInt(input.val()), emptyObject.features[0].geometry);
          });
        },
        update: async function() {

        }
      }
    },
    preferencesScreen: {
      view: {
        data: {
          table: null,
          editing: false,
          editingTMO: null,
          dtt: null
        },
        stopEditing: function() {
          if ( this.data.editingTMO != null ) {
            clearTimeout(this.data.editingTMO);
          }
          this.data.editing = false;
        },
        /**
         * Inject preference table into html.<br />
         */
        injectPreferencesIntoHTML: async function (init) {
          const prefs = await getPref(null);
          this.IPIrecurse(prefs, undefined,init);
        },
        /**
        * PRIVATE<br />
        * Create or update entry into preference table.<br />
        */
        ensureEntry: function (name, obj,init) {
          const value = typeof(obj.value)==="string" ? obj.value : JSON.stringify(obj.value);

          let foundValue = false;

          if ( ! init ) {
            foundValue = DTTsearchEntry(this.data.dtt, 
              (rowData) => rowData[0] === name, 
              (row,rowData) => {
                rowData[1] = value;
                row.data(rowData).draw();
                return rowData;
              }
            );
          }

          if ( init || ! foundValue) {
              const row = document.createElement("tr");
              const prefnameTD = document.createElement("td");
              const prefchanger = document.createElement("td");
              const prefDescription = document.createElement("td");
              prefnameTD.textContent = name;
              prefchanger.textContent = value;
              prefDescription.textContent = translate("tab_settings_preferencesScreen_prefs_" + name.replaceAll(".", "_"));
              row.append(prefnameTD);
              row.append(prefchanger);
              row.append(prefDescription);
              row.style.textAlign = "center";
              row.style.verticalAlign = "middle";
              this.data.dtt.row.add(row).draw();
          }
        },
        /**
        * PRIVATE<br />
        * Recurse in preference tree and create entries in the table.<br />
        */
        IPIrecurse: function (obj, name, init) {
          if ( this.data.editing ) {
              return;
          } else {
              if ( typeof(obj) === "object" ) {
                  if ( obj.value !== undefined && obj.description !== undefined ) {
                      this.ensureEntry(name, obj,init);
                  } else {
                      for(const k of Object.keys(obj)) {
                          this.IPIrecurse(obj[k], name === undefined ? k : name + "." + k,init);
                      }
                  }
              }
          }
        },
        init: async function() {
          $(document).ready(async () => {
            const table = $('#prefsTable');
            const dtt = table.DataTable({
              language: {
                  url: getDatatableTranslation()
              },
              columns: [
                { 
                  data: 0
                },
                {   
                  data: 1,
                  render: function (data) {
                       return '<div class="form-group"><input class="form-control" type="text" value="' + data + '" /></div>';
                  }
                },
                { 
                  data: 2
                }
              ],
              rowCallback: ( row, data ) => {
                const prefchangerTextA = row.children[1].children[0];
                prefchangerTextA.addEventListener('focusin', (event) => {
                  this.data.editing = true;
                }, true);
                prefchangerTextA.addEventListener('focusout', async (event) => {
                    if ( this.data.editingTMO != null ) {
                        clearTimeout(this.data.editingTMO);
                    }
                    this.data.editingTMO = setTimeout(() => {
                       this.stopEditing();
                    }, await getPref("tab.settings.preferencesScreen.msBeforeStopEdit"));
                }, true);
                prefchangerTextA.setAttribute("type", "text");
                prefchangerTextA.addEventListener('input', (event) => {
                  DTTsearchEntry(dtt, 
                    (rowData) => rowData[0] === data[0], 
                    (row,rowData) => {
                      rowData[1] = event.target.value;
                      return rowData;
                    }
                  );
                });
              }
            });
            dtt.on("init", function() {
              document.getElementById("prefsTable_wrapper").style.width = "100%";
            });
            this.data.dtt = dtt;
            await this.injectPreferencesIntoHTML(true);
            document.getElementById("tab_settings_preferencesScreen_validateButton").addEventListener("click", async () => {
              this.stopEditing();
              const prefs = await getOrCreatePreferences();
              const childrens = dtt.rows()[0];
              for(let j = 0; j < childrens.length; j = j + 1) {
                const rowId = childrens[j];
                const row = dtt.row(rowId);
                let rowData = row.data();
                let value = rowData[1];
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
                IPIPrecurse(prefs, rowData[0], value);
              }
              await obrowser.storage.local.set({pref: JSON.stringify(prefs)});
            });
            document.getElementById("tab_settings_preferencesScreen_resetButton").addEventListener("click", async () => {
              this.stopEditing();
              await obrowser.storage.local.remove("pref");
            });
            document.getElementById("tab_settings_preferencesScreen_importExportButton").addEventListener("click", async () => {
              const element = document.getElementById("tab_settings_preferencesScreen_importExport_modal_input");
              element.value = JSON.stringify(await getOrCreatePreferences());
            });
            document.getElementById("tab_settings_preferencesScreen_importExport_modal_save").addEventListener("click", async () => {
              const element = document.getElementById("tab_settings_preferencesScreen_importExport_modal_input");
              try {
                JSON.parse(element.value);
                $('#tab_settings_preferencesScreen_importExport_modal').modal('hide');
                await obrowser.storage.local.set({pref: element.value});
              } catch(error) {
                alert("Cannot set preferences : \n " + error.name + "\n  " + error.message);
              }
            });
          });
        },
        update: async function() {
          await this.injectPreferencesIntoHTML(false);
        }
      }
    }
  }, 
  /**
   * More information.
   */
  moreInfo: {

  },
  /**
   * Methods and related work.
   */
  methods: {

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

    if ( changes["stats"] !== undefined ) {
      tab.stats = await getOrCreateStats();
    }

    if ( changes["rawdata"] === undefined ) {
      storageChangedTimeout = setTimeout(storageChangedTimeoutCall, 100);
    } else {
      if ( await getPref("tab.update.auto_refresh") ) {
        storageChangedTimeout = setTimeout(storageChangedTimeoutCall, 100);
      }
    }

  }
}

T_init = async () => {

  window.removeEventListener("load", T_init);
  window.addEventListener("unload", end);

  loadTranslations();

  tab.stats = await getOrCreateStats();
  tab.init();

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
