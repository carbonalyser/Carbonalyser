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

// Inject latest refresh in html
injectLatestRefershCarbonIntensity = () => {
  const div = document.getElementById("carbonIntensityLastRefreshIP");
  div.textContent = chrome.i18n.getMessage('settingsLastRefresh', [new Date(getParameters().lastRefresh).toLocaleString()]);
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
  initView: () => {
    tab.results.initView();
    tab.settings.initView();
    tab.history.initView();
  },
  updateView: () => {
    tab.results.updateView();
    tab.settings.updateView();
    tab.history.updateView();
  },
  stats: null,
  parameters: null,
  rawdata: null,

  /**
   * Show same results as the popup.
   */
  results: {
    initView: () => {
      tab.results.equivalence.initView();
      tab.results.detailledView.initView();
    }, 
    updateView: () => {
      tab.results.equivalence.updateView();
      tab.results.detailledView.updateView();
    }, 
    /**
     * Equivalence in smartphone charged, kilometers by car.
     */
    equivalence: {
      initView: () => {
        tab.results.equivalence.updateView();
      },
      updateView: () => {
        updateEquivalence(tab.stats);
      }
    }, 
    /**
     * Detailled view of electricity consumption during browsing.
     */
    detailledView: {
      initView: () => {
        const topResults = document.getElementById("topResults");
        for(let i = 0; i < tab.stats.highestStats.length; i ++) {
          tab.results.detailledView.createEntry(tab.stats.highestStats[i], topResults, true);
        }

        // Add some sorters
        $(document).ready(function() {
          const table = $('#topResultsTable');
          table.DataTable();
          document.getElementById("topResultsTable_wrapper").style.width = "100%";
        });
      }, 
      updateView: () => {
        const topResults = document.getElementById("topResults");
        for(let i = 0; i < tab.stats.highestStats.length; i ++) {
          tab.results.detailledView.createEntry(tab.stats.highestStats[i], topResults, false);
        }
      },
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
      }
    }
  },

  /**
   * Parametrize the system.
   */
  settings: {
    initView: () => {
      tab.settings.updateView();
    },
    updateView: () => {
      tab.settings.selectRegion.updateView();
      tab.settings.updateCarbonIntensity.updateView();
      tab.settings.carbonIntensityView.updateView();
    },
    selectRegion: {
      updateView: () => {
        injectRegionIntoHTML(tab.parameters.regions, tab.parameters.selectedRegion);
      }
    }, updateCarbonIntensity: {
      updateView: () => {

      }
    }, carbonIntensityView: {
      updateView: () => {

      }
    }
  }, 
  /**
   * View history of results.
   */
  history: {
    initView: () => {

    }, 
    updateView: () => {

    }
  }
}

init = () => {

  tab.parameters = getParameters();
  tab.rawdata = getOrCreateRawData();
  tab.stats = getStats();

  tab.initView();

  // Compute sum of datas
  const bytesDataCenterUnordered = createSumOfData(tab.rawdata, 'datacenter', 60);
  let bytesNetworkUnordered = createSumOfData(tab.rawdata, 'network', 60);
  bytesNetworkUnordered = mergeTwoSOD(bytesDataCenterUnordered, bytesNetworkUnordered);
  fillSODGaps(bytesNetworkUnordered);
  fillSODGaps(bytesDataCenterUnordered);
  const bytesDataCenterObjectForm = createObjectFromSumOfData(bytesDataCenterUnordered).sort((a,b) => a.x > b.x);
  const bytesNetworkObjectForm = createObjectFromSumOfData(bytesNetworkUnordered).sort((a,b) => a.x > b.x);

  const data = {
    datasets: [
      {
        label: 'Data used from datacenter',
        data: bytesDataCenterObjectForm,
        borderColor: 'rgb(255, 0, 0)',
        showLine: true,
        lineTension: 0.2,
      },
      {
        label: 'Data used over network',
        data: bytesNetworkObjectForm,
        borderColor: 'rgb(0, 255, 0)',
        showLine: true,
        lineTension: 0.2
      }
    ]
  };

  const config = {
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

  const myChart = new Chart(
    document.getElementById('historyDivCanvas'),
    config
  );

  const electricityDataCenterObjectForm = [], electricityNetworkObjectForm = [];
  for(let o of bytesDataCenterObjectForm) {
    electricityDataCenterObjectForm.push({x: o.x, y: o.y * kWhPerByteDataCenter});
  }
  for(let o of bytesNetworkObjectForm) {
    electricityNetworkObjectForm.push({x: o.x, y: o.y * kWhPerByteNetwork});
  }


  const dataElectrity = {
    datasets: [
      {
        label: 'Electricity consummed in datacenter',
        data: electricityDataCenterObjectForm,
        borderColor: 'rgb(255, 0, 0)',
        showLine: true,
        lineTension: 0.2,
      },
      {
        label: 'Electricity consummed routing infra',
        data: electricityNetworkObjectForm,
        borderColor: 'rgb(0, 255, 0)',
        showLine: true,
        lineTension: 0.2,
      }
    ]
  };

  const configElectricity = {
    type: 'line',
    data: dataElectrity,
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

  // create electricty graph
  //
  const electricityChart = new Chart(
    document.getElementById('historyElectricityDivCanvas'),
    configElectricity
  );

  // create the pie chart
  const topStats = getStats(100);
  const labels = [], series = [];
  for (let index in topStats.highestStats) {
    if (topStats.highestStats[index].percent < 1) {
      continue;
    }

    labels.push(topStats.highestStats[index].origin);
    series.push(topStats.highestStats[index].percent);
  }

  const CHART_COLORS = {
    red: 'rgb(255, 99, 132)',
    orange: 'rgb(255, 159, 64)',
    yellow: 'rgb(255, 205, 86)',
    green: 'rgb(75, 192, 192)',
    blue: 'rgb(54, 162, 235)',
    purple: 'rgb(153, 102, 255)',
    grey: 'rgb(201, 203, 207)'
  };

  const pieData = {
    labels: labels,
    datasets: [{
      label: 'Share of websites',
      data: series,
      backgroundColor: Object.values(CHART_COLORS)
    }]
  };
  
  const pieConfig = {
    type: 'pie',
    data: pieData
  };

  new Chart(
    document.getElementById('historyPieCanvas'),
    pieConfig
  );

  injectLatestRefershCarbonIntensity();

  document.getElementById("carbonIntensityLastRefreshForceRefresh").addEventListener("click", function(){
    chrome.runtime.sendMessage({action: "forceCIUpdater"});
    injectLatestRefershCarbonIntensity();
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
