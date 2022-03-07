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
    init: () => {
      tab.results.model.init();
      tab.settings.model.init();
      tab.history.model.init();
    },
    update: () => {
      tab.results.model.update();
      tab.settings.model.update();
      tab.history.model.update();
    }
  },
  view: {
    init: () => {
      tab.results.view.init();
      tab.settings.view.init();
      tab.history.view.init();
    },
    update: () => {
      tab.results.view.update();
      tab.settings.view.update();
      tab.history.view.update();
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
      init: () => {
        tab.results.equivalence.model.init();
        tab.results.detailledView.model.init();
      },
      update: () => {
        tab.results.equivalence.model.update();
        tab.results.detailledView.model.update();
      }
    },
    view: {
      init: () => {
        tab.results.equivalence.view.init();
        tab.results.detailledView.view.init();
      },
      update: () => {
        tab.results.equivalence.view.update();
        tab.results.detailledView.view.update();
      }
    },
    /**
     * Equivalence in smartphone charged, kilometers by car.
     */
    equivalence: {
      model: {
        init: () => {
          if ( tab.stats === null ) {
            tab.stats = getStats();
          }
        },
        update: () => {
          tab.stats = getStats();
        }
      },
      view: {
        init: () => {
          updateEquivalence(tab.stats);
        },
        update: () => {
          tab.results.equivalence.model.update();
        }
      }
    }, 
    /**
     * Detailled view of electricity consumption during browsing.
     */
    detailledView: {
      model: {
        init: () => {
          if ( tab.stats === null ) {
            tab.stats = getStats();
          }
          if ( tab.rawdata === null ) {
            tab.rawdata = getOrCreateRawData();
          }
        },
        update: () => {
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
        createEntry: (stat, topResults, init) => {

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
        init: () => {
          const topResults = document.getElementById("topResults");
          for(let i = 0; i < tab.stats.highestStats.length; i ++) {
            tab.results.detailledView.view.createEntry(tab.stats.highestStats[i], topResults, true);
          }
  
          // Add some sorters
          $(document).ready(function() {
            const table = $('#topResultsTable');
            table.DataTable();
            document.getElementById("topResultsTable_wrapper").style.width = "100%";
          });
        },
        update: () => {
          const topResults = document.getElementById("topResults");
          for(let i = 0; i < tab.stats.highestStats.length; i ++) {
            tab.results.detailledView.view.createEntry(tab.stats.highestStats[i], topResults, false);
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
      init: () => {
        tab.settings.selectRegion.model.init();
        tab.settings.updateCarbonIntensity.model.init();
        tab.settings.carbonIntensityView.model.init();
      },
      update: () => {
        tab.settings.selectRegion.model.update();
        tab.settings.updateCarbonIntensity.model.update();
        tab.settings.carbonIntensityView.model.update();
      }
    },
    view: {
      init: () => {
        tab.settings.selectRegion.view.init();
        tab.settings.updateCarbonIntensity.view.init();
        tab.settings.carbonIntensityView.view.init();
      },
      update: () => {
        tab.settings.selectRegion.view.update();
        tab.settings.updateCarbonIntensity.view.update();
        tab.settings.carbonIntensityView.view.update();
      }
    },
    selectRegion: {
      model: {
        init: () => {
          console.error("not implemented");
        },
        update: () => {
          console.error("not implemented");
        }
      },
      view: {
        init: () => {
          console.error("not implemented");
        },
        update: () => {
          injectRegionIntoHTML(tab.parameters.regions, tab.parameters.selectedRegion);
        }
      }
    },
    updateCarbonIntensity: {
      model: {
        init: () => {
          if ( tab.parameters == null ) {
            tab.parameters = getParameters();
          }
        },
        update: () => {
          tab.parameters = getParameters();
        }
      },
      view: {
        div: null,
        init: () => {
          tab.settings.updateCarbonIntensity.view.div = document.getElementById("carbonIntensityLastRefreshIP");
          tab.settings.updateCarbonIntensity.view.update();
        },
        update: () => {
          tab.settings.updateCarbonIntensity.view.div.textContent = chrome.i18n.getMessage('settingsLastRefresh', [new Date(tab.parameters.lastRefresh).toLocaleString()]);
        }
      }
    }, 
    carbonIntensityView: {
      model: {
        init: () => {
          console.error("not implemented");
        },
        update: () => {
          console.error("not implemented");
        }
      },
      view: {
        init: () => {
          console.error("not implemented");
        },
        update: () => {
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
      init: () => {
        const bytesDataCenterUnordered = createSumOfData(tab.rawdata, 'datacenter', 60);
        let bytesNetworkUnordered = createSumOfData(tab.rawdata, 'network', 60);
        bytesNetworkUnordered = mergeTwoSOD(bytesDataCenterUnordered, bytesNetworkUnordered);
        fillSODGaps(bytesNetworkUnordered);
        fillSODGaps(bytesDataCenterUnordered);
        tab.history.model.bytesDataCenterObjectForm = createObjectFromSumOfData(bytesDataCenterUnordered).sort((a,b) => a.x > b.x);
        tab.history.model.bytesNetworkObjectForm = createObjectFromSumOfData(bytesNetworkUnordered).sort((a,b) => a.x > b.x);
        tab.history.data.model.init();
        tab.history.electricityConsumptionOverTime.model.init();
      },
      update: () => {
        tab.history.data.model.update();
        tab.history.electricityConsumptionOverTime.model.update();
      }
    },
    view: {
      init: () => {
        tab.history.data.view.init();
        tab.history.electricityConsumptionOverTime.view.init();
      },
      update: () => {
        tab.history.data.view.update();
        tab.history.electricityConsumptionOverTime.view.update();
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
          init: () => {
            console.warn("call history.model.init instead");
          },
          update: () => {
            console.warn("call history.model.update instead");
          }
        },
        view: {
          data: null,
          config: null,
          myChart: null,
          init: () => {

            tab.history.data.consumptionOverTime.view.data = {
              datasets: [
                {
                  label: 'Data used from datacenter',
                  data: tab.history.model.bytesDataCenterObjectForm,
                  borderColor: 'rgb(255, 0, 0)',
                  showLine: true,
                  lineTension: 0.2,
                },
                {
                  label: 'Data used over network',
                  data: tab.history.model.bytesNetworkObjectForm,
                  borderColor: 'rgb(0, 255, 0)',
                  showLine: true,
                  lineTension: 0.2
                }
              ]
            };

            tab.history.data.consumptionOverTime.view.config = {
              type: 'line',
              data: tab.history.data.consumptionOverTime.view.data,
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
          
            tab.history.data.consumptionOverTime.view.myChart = new Chart(
              document.getElementById('historyDivCanvas'),
              tab.history.data.consumptionOverTime.view.config
            );
          },
          update: () => {
            console.error("not implemented");
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
          init: () => {
            tab.history.data.consumptionShareAmongSites.model.topStats = getStats(100);
            tab.history.data.consumptionShareAmongSites.model.labels = [];
            tab.history.data.consumptionShareAmongSites.model.series = [];
            for (const index in tab.history.data.consumptionShareAmongSites.model.topStats.highestStats) {
              if (tab.history.data.consumptionShareAmongSites.model.topStats.highestStats[index].percent < 1) {
                continue;
              }

              tab.history.data.consumptionShareAmongSites.model.labels.push(tab.history.data.consumptionShareAmongSites.model.topStats.highestStats[index].origin);
              tab.history.data.consumptionShareAmongSites.model.series.push(tab.history.data.consumptionShareAmongSites.model.topStats.highestStats[index].percent);
            }
          },
          update: () => {
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
          init: () => {
            tab.history.data.consumptionShareAmongSites.view.pieData = {
              labels: tab.history.data.consumptionShareAmongSites.model.labels,
              datasets: [{
                label: 'Share of websites',
                data: tab.history.data.consumptionShareAmongSites.model.series,
                backgroundColor: Object.values(tab.history.data.consumptionShareAmongSites.view.CHART_COLORS)
              }]
            };
            
            tab.history.data.consumptionShareAmongSites.view.pieConfig = {
              type: 'pie',
              data: tab.history.data.consumptionShareAmongSites.view.pieData
            };
          
            tab.history.data.consumptionShareAmongSites.view.chart = new Chart(
              document.getElementById('historyPieCanvas'),
              tab.history.data.consumptionShareAmongSites.view.pieConfig
            );
          },
          update: () => {
            console.error("not implemented");
          }
        }
      },
      model: {
        init: () => {
          tab.history.data.consumptionShareAmongSites.model.init();
          tab.history.data.consumptionOverTime.model.init();
        },
        update: () => {
          tab.history.data.consumptionShareAmongSites.model.update();
          tab.history.data.consumptionOverTime.model.update();
        }
      },
      view: {
        init: () => {
          tab.history.data.consumptionShareAmongSites.view.init();
          tab.history.data.consumptionOverTime.view.init();
        },
        update: () => {
          tab.history.data.consumptionShareAmongSites.model.update();
          tab.history.data.consumptionOverTime.model.update();
        }
      }
    },
    electricityConsumptionOverTime: {
      model: {
        electricityDataCenterObjectForm: null,
        electricityNetworkObjectForm: null,
        init: () => {
          tab.history.electricityConsumptionOverTime.model.electricityDataCenterObjectForm = [];
          tab.history.electricityConsumptionOverTime.model.electricityNetworkObjectForm = [];
          for(let o of tab.history.model.bytesDataCenterObjectForm) {
            tab.history.electricityConsumptionOverTime.model.electricityDataCenterObjectForm.push({x: o.x, y: o.y * kWhPerByteDataCenter});
          }
          for(let o of tab.history.model.bytesNetworkObjectForm) {
            tab.history.electricityConsumptionOverTime.model.electricityNetworkObjectForm.push({x: o.x, y: o.y * kWhPerByteNetwork});
          }
        },
        update: () => {
          console.error("not implemented");
        }
      },
      view: {
        data: null,
        init: () => {
          tab.history.electricityConsumptionOverTime.view.data = {
            datasets: [
              {
                label: 'Electricity consummed in datacenter',
                data: tab.history.electricityConsumptionOverTime.model.electricityDataCenterObjectForm,
                borderColor: 'rgb(255, 0, 0)',
                showLine: true,
                lineTension: 0.2,
              },
              {
                label: 'Electricity consummed routing infra',
                data: tab.history.electricityConsumptionOverTime.model.electricityNetworkObjectForm,
                borderColor: 'rgb(0, 255, 0)',
                showLine: true,
                lineTension: 0.2,
              }
            ]
          };
        
          tab.history.electricityConsumptionOverTime.view.config = {
            type: 'line',
            data: tab.history.electricityConsumptionOverTime.view.data,
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
          tab.history.electricityConsumptionOverTime.view.chart = new Chart(
            document.getElementById('historyElectricityDivCanvas'),
            tab.history.electricityConsumptionOverTime.view.config
          );
        },
        update: () => {
          console.error("not implemented");
        }
      }
    }
  }
}

init = () => {

  // trashcan
  tab.parameters = getParameters();
  tab.rawdata = getOrCreateRawData();
  tab.stats = getStats();
  //

  tab.model.init();
  tab.view.init();

  document.getElementById("carbonIntensityLastRefreshForceRefresh").addEventListener("click", function(){
    chrome.runtime.sendMessage({action: "forceCIUpdater"});
    tab.settings.updateCarbonIntensity.model.update();
    tab.settings.updateCarbonIntensity.view.update();
  });

  const settingsCICIS = document.getElementById("settingsCICIS");
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
}

attachHandlerToSelectRegion();
loadTranslations();

window.addEventListener("load", function(event) {
  init();
});
