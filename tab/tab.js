// Create a sum of data for all websites
createSumOfData = (dataObject) => {
  const rv = {};
  for(let origin in dataObject) {
    for(let tso in dataObject[origin].dots ) {
      const ts = parseInt(tso);
      if ( rv[ts] === undefined ) {
        rv[ts] = 0;
      }
      rv[ts] += dataObject[origin].dots[ts];
    }
  }
  return rv;
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

init = () => {

  if ( getSelectedRegion() !== null ) {
    selectRegion.value = userLocation;
  }
  
  const statsStorage = getOrCreateStats();
  const topResults = document.getElementById("topResults");
  const stats = getStats();
  const computedEquivalence = computeEquivalenceFromStatsItem(stats);

  for(let i = 0; i < stats.highestStats.length; i ++) {
      const stat = stats.highestStats[i];
      const tr = document.createElement("tr");
      const percent = document.createElement("td");
      const site = document.createElement("td");
      const data = document.createElement("td");
      const network = document.createElement("td");
      tr.className = "oneResult";
      percent.textContent = stat.percent;
      site.textContent = stat.origin;
      data.textContent = toMegaByteNoRound(statsStorage.bytesDataCenter[stat.origin].total);
      network.textContent = toMegaByteNoRound(statsStorage.bytesNetwork[stat.origin].total + statsStorage.bytesDataCenter[stat.origin].total);
      tr.appendChild(percent);
      tr.appendChild(site);
      tr.appendChild(data);
      tr.appendChild(network);
      topResults.appendChild(tr);
  }

  injectEquivalentIntoHTML(stats, computedEquivalence);

  // Compute sum of datas
  const bytesDataCenterUnordered = createSumOfData(statsStorage.bytesDataCenter);
  const bytesNetworkUnordered = createSumOfData(statsStorage.bytesNetwork);
  for(let ts in bytesDataCenterUnordered) {
    if ( bytesNetworkUnordered[ts] === undefined ) {
      bytesNetworkUnordered[ts] = bytesDataCenterUnordered[ts];
    } else {
      bytesNetworkUnordered[ts] += bytesDataCenterUnordered[ts];
    }
  }
  let bytesDataCenterObjectForm = createObjectFromSumOfData(bytesDataCenterUnordered);
  const bytesNetworkObjectForm = createObjectFromSumOfData(bytesNetworkUnordered);
  bytesDataCenterObjectForm = bytesDataCenterObjectForm.sort((a, b) => {
      return a.x < a.y;
  });

  const data = {
    datasets: [
      {
        label: 'Data used from datacenter',
        data: bytesDataCenterObjectForm,
        borderColor: 'rgb(255, 0, 0)',
        showLine: false
      },
      {
        label: 'Data used over network',
        data: bytesNetworkObjectForm,
        borderColor: 'rgb(0, 255, 0)',
        showLine: false
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
          text: 'Data consumption over the time'
        },
        decimation: {
          enabled: true,
          algorithm: 'lttb',
          //samples: 5,
          threshold: 10
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Time'
          }, 
          type: 'time'
        },
        y: {
            title: {
              display: true,
              text: 'Data consumption (mo)'
            },
            ticks: {
                // Include a dollar sign in the ticks
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


}

selectRegionHandler = (event) => {
    const selectedRegion = event.target.value;
  
    if ('' === selectedRegion) {
      return;
    }
  
    localStorage.setItem('selectedRegion', selectedRegion);
    userLocation = selectedRegion;
}

const selectRegion = document.getElementById('selectRegion');
selectRegion.addEventListener('change', selectRegionHandler);

loadTranslations();

window.addEventListener("load", function(event) {
  init();
});
