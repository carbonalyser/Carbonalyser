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

  createObjectFromSumOfData = (sod) => {
    const rv = [];
    for(let ts in sod) {
      rv.push({x: parseInt(ts), y: parseInt(sod[ts])});
    }
    return rv;
  }

  const bytesDataCenterUnordered = createSumOfData(statsStorage.bytesDataCenter);
  const bytesNetworkUnordered = createSumOfData(statsStorage.bytesNetwork);
  for(let ts in bytesDataCenterUnordered) {
    if ( bytesNetworkUnordered[ts] === undefined ) {
      bytesNetworkUnordered[ts] = bytesDataCenterUnordered[ts];
    } else {
      bytesNetworkUnordered[ts] += bytesDataCenterUnordered[ts];
    }
  }
  const bytesDataCenterObjectForm = createObjectFromSumOfData(bytesDataCenterUnordered);
  const bytesNetworkObjectForm = createObjectFromSumOfData(bytesNetworkUnordered);

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
            },
            //min: 10,
            //max: 1 * 1000000
        }
      }
    },
  };

  const myChart = new Chart(
    document.getElementById('historyDivCanvas'),
    config
  );

  /*
  new Chartist.Line('#historyDiv', {
    labels: labels,
    series: [
      serie
    ]
  }, {
    height: "100%",
    fullWidth: true,
    chartPadding: {
      right: 40,
      top: 40,
      left: 40,
      bottom: 40
    }
  });
*/
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

init();