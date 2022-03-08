// Create a sum of data for all websites
// tsInterval in s
createSumOfData = (dataObject, type, tsInterval=60*10) => {
  tsInterval *= 1000;
  const rv = {};
  for(let origin in dataObject) {
    const keys = Object.keys(dataObject[origin][type].dots);
    for(let tso in dataObject[origin][type].dots ) {
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

/**
 * This holds all the data from the storage
 * on the fly compute data.
 */
const tab = {
  model: {
    init: function () {
      this.parent.settings.model.init();
      this.parent.results.model.init();
      this.parent.history.model.init();
    },
    update: function () {
      this.parent.results.model.update();
      this.parent.settings.model.update();
      this.parent.history.model.update();
    }
  },
  view: {
    init: function () {
      this.parent.results.view.init();
      this.parent.settings.view.init();
      this.parent.history.view.init();
    },
    update: function () {
      this.parent.results.view.update();
      this.parent.settings.view.update();
      this.parent.history.view.update();
    }
  },
  stats: null,
  parameters: null,
  rawdata: null,

  /**
   * Show same results as the popup.
   */
  results: {
    model: {
      init: function () {
        this.parent.equivalence.model.init();
        this.parent.detailledView.model.init();
      },
      update: function () {
        this.parent.equivalence.model.update();
        this.parent.detailledView.model.update();
      }
    },
    view: {
      init: function () {
        this.parent.equivalence.view.init();
        this.parent.detailledView.view.init();
      },
      update: function () {
        this.parent.equivalence.view.update();
        this.parent.detailledView.view.update();
      }
    },
    /**
     * Equivalence in smartphone charged, kilometers by car.
     */
    equivalence: {
      model: {
        init: function () {
          if ( tab.stats === null ) {
            tab.stats = getStats();
          }
        },
        update: function () {
          tab.stats = getStats();
        }
      },
      view: {
        init: function () {
          updateEquivalence(tab.stats);
        },
        update: function () {
          this.parent.model.update();
        }
      }
    }, 
    /**
     * Detailled view of electricity consumption during browsing.
     */
    detailledView: {
      model: {
        init: function () {
          if ( tab.stats === null ) {
            tab.stats = getStats();
          }
          if ( tab.rawdata === null ) {
            tab.rawdata = getOrCreateRawData();
          }
        },
        update: function () {
          tab.stats = getStats();
          tab.rawdata = getOrCreateRawData();
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

          let foundValue = false;
          if ( ! init ) {
            for(const row of topResults.children) {
              if ( row.children[1].textContent == stat.origin ) {
                foundValue = true;
                row.children[0] = stat.percent;
                row.children[2] = toMegaByteNoRound(tab.rawdata[stat.origin].datacenter.total);
                row.children[3] = toMegaByteNoRound(tab.rawdata[stat.origin].network.total + tab.rawdata[stat.origin].datacenter.total);
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
            data.textContent = toMegaByteNoRound(tab.rawdata[stat.origin].datacenter.total);
            network.textContent = toMegaByteNoRound(tab.rawdata[stat.origin].network.total + tab.rawdata[stat.origin].datacenter.total);
            tr.appendChild(percent);
            tr.appendChild(site);
            tr.appendChild(data);
            tr.appendChild(network);
            topResults.appendChild(tr);
          }
        },
        init: function () {
          const topResults = document.getElementById("topResults");
          for(let i = 0; i < tab.stats.highestStats.length; i ++) {
            this.createEntry(tab.stats.highestStats[i], topResults, true);
          }
  
          // Add some sorters
          $(document).ready(function() {
            const table = $('#topResultsTable');
            table.DataTable();
            document.getElementById("topResultsTable_wrapper").style.width = "100%";
          });
        },
        update: function () {
          const topResults = document.getElementById("topResults");
          for(let i = 0; i < tab.stats.highestStats.length; i ++) {
            this.createEntry(tab.stats.highestStats[i], topResults, false);
          }
        }
      }
    }
  },

  /**
   * Parametrize the system.
   */
  settings: {
    model: {
      init: function () {
        this.parent.selectRegion.model.init();
        this.parent.updateCarbonIntensity.model.init();
        this.parent.carbonIntensityView.model.init();
      },
      update: function () {
        this.parent.selectRegion.model.update();
        this.parent.updateCarbonIntensity.model.update();
        this.parent.carbonIntensityView.model.update();
      }
    },
    view: {
      init: function () {
        this.parent.selectRegion.view.init();
        this.parent.updateCarbonIntensity.view.init();
        this.parent.carbonIntensityView.view.init();
      },
      update: function () {
        this.parent.selectRegion.view.update();
        this.parent.updateCarbonIntensity.view.update();
        this.parent.carbonIntensityView.view.update();
      }
    },
    selectRegion: {
      model: {
        init: function () {
          console.error("not implemented");
        },
        update: function () {
          console.error("not implemented");
        }
      },
      view: {
        init: function () {
          // part of the refresh system
          document.getElementById("carbonIntensityLastRefreshForceRefresh").addEventListener("click", async function(){
            chrome.runtime.sendMessage({action: "forceCIUpdater"});
            tab.settings.updateCarbonIntensity.model.update();
            tab.settings.updateCarbonIntensity.view.update();
          });
          injectRegionIntoHTML(tab.parameters.regions, tab.parameters.selectedRegion);
        },
        update: function () {
          injectRegionIntoHTML(tab.parameters.regions, tab.parameters.selectedRegion);
        }
      }
    },
    updateCarbonIntensity: {
      model: {
        init: function () {
          if ( tab.parameters == null ) {
            tab.parameters = getParameters();
          }
        },
        update: function () {
          tab.parameters = getParameters();
        }
      },
      view: {
        div: null,
        init: function () {
          div = document.getElementById("carbonIntensityLastRefreshIP");
          this.update();
        },
        update: function () {
          div.textContent = chrome.i18n.getMessage('settingsLastRefresh', [new Date(tab.parameters.lastRefresh).toLocaleString()]);
        }
      }
    }, 
    carbonIntensityView: {
      model: {
        init: function () {
          tab.parameters.regions = getRegions();
        },
        update: function () {
          tab.parameters.regions = getRegions();
        }
      },
      view: {
        settingsCICIS: null,
        init: function () {
          settingsCICIS = document.getElementById("settingsCICIS");
          for(const name in tab.parameters.regions) {
            const row = document.createElement("tr");
            const country = document.createElement("td");
            let region = translate("region" + capitalizeFirstLetter(name));
            if ( region === "" || region === null ) {
              region = name;
            }
            country.textContent = region;
            const ci = document.createElement("td");
            ci.textContent = tab.parameters.regions[name].carbonIntensity;
            row.append(country);
            row.append(ci);
            row.style.textAlign = "center";
            row.style.verticalAlign = "middle";
            settingsCICIS.append(row);
          }
          $(document).ready(function() {
            const table = $('#settingsCItable');
            table.DataTable();
            document.getElementById("settingsCItable_wrapper").style.width = "100%";
          });
        },
        update: function () {
          console.error("not implemented");
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
      init: function () {
        tab.rawdata = getOrCreateRawData();
        const bytesDataCenterUnordered = createSumOfData(tab.rawdata, 'datacenter', 60);
        let bytesNetworkUnordered = createSumOfData(tab.rawdata, 'network', 60);
        bytesNetworkUnordered = mergeTwoSOD(bytesDataCenterUnordered, bytesNetworkUnordered);
        fillSODGaps(bytesNetworkUnordered);
        fillSODGaps(bytesDataCenterUnordered);
        this.bytesDataCenterObjectForm = createObjectFromSumOfData(bytesDataCenterUnordered).sort((a,b) => a.x > b.x);
        this.bytesNetworkObjectForm = createObjectFromSumOfData(bytesNetworkUnordered).sort((a,b) => a.x > b.x);
        this.parent.data.model.init();
        this.parent.electricityConsumptionOverTime.model.init();
      },
      update: function () {
        this.init();
      }
    },
    view: {
      init: function () {
        this.parent.data.view.init();
        this.parent.electricityConsumptionOverTime.view.init();
      },
      update: function () {
        this.parent.data.view.update();
        this.parent.electricityConsumptionOverTime.view.update();
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
        model: {
          init: function () {
            console.warn("call history.model.init instead");
          },
          update: function () {
            console.warn("call history.model.update instead");
          }
        },
        view: {
          data: null,
          config: null,
          myChart: null,
          init: function () {
            const parent = this.parent.parent.parent;
            this.data = {
              datasets: [
                {
                  label: 'Data used from datacenter',
                  data: parent.model.bytesDataCenterObjectForm,
                  borderColor: 'rgb(255, 0, 0)',
                  showLine: true,
                  lineTension: 0.2,
                },
                {
                  label: 'Data used over network',
                  data: parent.model.bytesNetworkObjectForm,
                  borderColor: 'rgb(0, 255, 0)',
                  showLine: true,
                  lineTension: 0.2
                }
              ]
            };

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
          update: function () {
            const parent = this.parent.parent.parent;
            this.myChart.data = {
              datasets: [
                {
                  label: 'Data used from datacenter',
                  data: parent.model.bytesDataCenterObjectForm,
                  borderColor: 'rgb(255, 0, 0)',
                  showLine: true,
                  lineTension: 0.2,
                },
                {
                  label: 'Data used over network',
                  data: parent.model.bytesNetworkObjectForm,
                  borderColor: 'rgb(0, 255, 0)',
                  showLine: true,
                  lineTension: 0.2
                }
              ]
            };
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
          init: function () {
            this.topStats = getStats(100);
            this.labels = [];
            this.series = [];
            for (const index in this.topStats.highestStats) {
              if (this.topStats.highestStats[index].percent < 1) {
                continue;
              }

              this.labels.push(this.topStats.highestStats[index].origin);
              this.series.push(this.topStats.highestStats[index].percent);
            }
          },
          update: function () {
            console.error("not implemented");
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
          init: function () {
            const parent = this.parent;
            this.pieData = {
              labels: parent.model.labels,
              datasets: [{
                label: 'Share of websites',
                data: parent.model.series,
                backgroundColor: Object.values(this.CHART_COLORS)
              }]
            };
            
            this.pieConfig = {
              type: 'pie',
              data: this.pieData
            };
          
            this.chart = new Chart(
              document.getElementById('historyPieCanvas'),
              this.pieConfig
            );
          },
          update: function () {
            console.error("not implemented");
          }
        }
      },
      model: {
        init: function () {
          this.parent.consumptionShareAmongSites.model.init();
          this.parent.consumptionOverTime.model.init();
        },
        update: function () {
          this.parent.consumptionShareAmongSites.model.update();
          this.parent.consumptionOverTime.model.update();
        }
      },
      view: {
        init: function () {
          this.parent.consumptionShareAmongSites.view.init();
          this.parent.consumptionOverTime.view.init();
        },
        update: function () {
          this.parent.consumptionShareAmongSites.model.update();
          this.parent.consumptionOverTime.model.update();
        }
      }
    },
    electricityConsumptionOverTime: {
      model: {
        electricityDataCenterObjectForm: null,
        electricityNetworkObjectForm: null,
        init: function () {
          this.electricityDataCenterObjectForm = [];
          this.electricityNetworkObjectForm = [];
          for(let o of tab.history.model.bytesDataCenterObjectForm) {
            this.electricityDataCenterObjectForm.push({x: o.x, y: o.y * kWhPerByteDataCenter});
          }
          for(let o of tab.history.model.bytesNetworkObjectForm) {
            this.electricityNetworkObjectForm.push({x: o.x, y: o.y * kWhPerByteNetwork});
          }
        },
        update: function () {
          console.error("not implemented");
        }
      },
      view: {
        data: null,
        config: null,
        chart: null,
        init: function () {
          const parent = this.parent;
          this.data = {
            datasets: [
              {
                label: 'Electricity consummed in datacenter',
                data: parent.model.electricityDataCenterObjectForm,
                borderColor: 'rgb(255, 0, 0)',
                showLine: true,
                lineTension: 0.2,
              },
              {
                label: 'Electricity consummed routing infra',
                data: parent.model.electricityNetworkObjectForm,
                borderColor: 'rgb(0, 255, 0)',
                showLine: true,
                lineTension: 0.2,
              }
            ]
          };

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
                  text: "Comsumption of electricity linked to your online activity (not only your computer)"
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
                      text: "electricity consumption KWh"
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
        update: function () {
          console.error("not implemented");
        }
      }
    }
  }
}

attachParent(tab);

init = () => {

  tab.model.init();
  tab.view.init();

}

attachHandlerToSelectRegion();
loadTranslations();

window.addEventListener("load", function(event) {
  init();
});
