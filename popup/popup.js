const defaultLocation = 'regionOther';
let userLocation = defaultLocation;

const defaultCarbonIntensityFactorIngCO2PerKWh = 519;
const kWhPerByteDataCenter = 0.000000000072;
const kWhPerByteNetwork = 0.000000000152;
const kWhPerMinuteDevice = 0.00021;

const GESgCO2ForOneKmByCar = 220;
const GESgCO2ForOneChargedSmartphone = 8.3;

const carbonIntensityFactorIngCO2PerKWh = {
  'regionEuropeanUnion': 276,
  'regionFrance': 34.8,
  'regionUnitedStates': 493,
  'regionChina': 681,
  'regionOther': defaultCarbonIntensityFactorIngCO2PerKWh
};

let statsInterval;
let pieChart;

parseStats = () => {
  const stats = localStorage.getItem('stats');
  return null === stats ? {} : JSON.parse(stats);
}

getStats = () => {
  const stats = parseStats();
  let total = 0;
  const sortedStats = [];

  for (let origin in stats) {
    total += stats[origin];
    sortedStats.push({ 'origin': origin, 'byte': stats[origin] });
  }

  sortedStats.sort(function(a, b) {
    return a.byte < b.byte ? 1 : a.byte > b.byte ? -1 : 0
  });

  const highestStats = sortedStats.slice(0, 4);
  let subtotal = 0;
  for (let index in highestStats) {
    subtotal += highestStats[index].byte;
  }

  if (total > 0) {
    const remaining = total - subtotal;
    if (remaining > 0) {
      highestStats.push({'origin': translate('statsOthers'), 'byte': remaining});
    }

    highestStats.forEach(function (item) {
      item.percent = Math.round(100 * item.byte / total)
    });
  }

  return {
    'total': total,
    'highestStats': highestStats
  }
}

toMegaByte = (value) => (Math.round(value/1024/1024));

showStats = () => {
  const stats = getStats();

  if (stats.total === 0) {
    return;
  }

  show(statsElement);
  const labels = [];
  const series = [];

  const statsListItemsElement = document.getElementById('statsListItems');
  while (statsListItemsElement.firstChild) {
    statsListItemsElement.removeChild(statsListItemsElement.firstChild);
  }

  for (let index in stats.highestStats) {
    if (stats.highestStats[index].percent < 1) {
      continue;
    }

    labels.push(stats.highestStats[index].origin);
    series.push(stats.highestStats[index].percent);
    const text = document.createTextNode(`${stats.highestStats[index].percent}% ${stats.highestStats[index].origin}`);
    const li = document.createElement("LI");
    li.appendChild(text);
    statsListItemsElement.appendChild(li);
  }

  let duration = localStorage.getItem('duration');
  duration = null === duration ? 0 : duration;

  const kWhDataCenterTotal = stats.total * kWhPerByteDataCenter;
  const GESDataCenterTotal = kWhDataCenterTotal * defaultCarbonIntensityFactorIngCO2PerKWh;

  const kWhNetworkTotal = stats.total * kWhPerByteNetwork;
  const GESNetworkTotal = kWhNetworkTotal * defaultCarbonIntensityFactorIngCO2PerKWh;

  const kWhDeviceTotal = duration * kWhPerMinuteDevice;
  const GESDeviceTotal = kWhDeviceTotal * carbonIntensityFactorIngCO2PerKWh[userLocation];

  const kWhTotal = Math.round(1000 * (kWhDataCenterTotal + kWhNetworkTotal + kWhDeviceTotal)) / 1000;
  const gCO2Total = Math.round(GESDataCenterTotal + GESNetworkTotal + GESDeviceTotal);

  const kmByCar = Math.round(1000 * gCO2Total / GESgCO2ForOneKmByCar) / 1000;
  const chargedSmartphones = Math.round(gCO2Total / GESgCO2ForOneChargedSmartphone);

  if (!pieChart) {
    pieChart = new Chartist.Pie('.ct-chart', {labels, series}, {
      donut: true,
      donutWidth: 60,
      donutSolid: true,
      startAngle: 270,
      showLabel: true
    });
  } else {
    pieChart.update({labels, series});
  }

  const megaByteTotal = toMegaByte(stats.total);
  document.getElementById('duration').textContent = duration.toString();
  document.getElementById('mbTotalValue').textContent = megaByteTotal;
  document.getElementById('kWhTotalValue').textContent = kWhTotal.toString();
  document.getElementById('gCO2Value').textContent = gCO2Total.toString();
  document.getElementById('chargedSmartphonesValue').textContent = chargedSmartphones.toString();
  document.getElementById('kmByCarValue').textContent = kmByCar.toString();

  const equivalenceTitle = document.getElementById('equivalenceTitle');
  while (equivalenceTitle.firstChild) {
    equivalenceTitle.removeChild(equivalenceTitle.firstChild);
  }
  equivalenceTitle.appendChild(document.createTextNode(chrome.i18n.getMessage('equivalenceTitle', [duration.toString(), megaByteTotal, kWhTotal.toString(), gCO2Total.toString()])));
}

start = () => {
  chrome.runtime.sendMessage({ action: 'start' });

  hide(startButton);
  show(stopButton);
  show(analysisInProgressMessage);
  localStorage.setItem('analysisStarted', '1');
}

stop = () => {
  chrome.runtime.sendMessage({ action: 'stop' });

  hide(stopButton);
  show(startButton);
  hide(analysisInProgressMessage);
  clearInterval(statsInterval);
  localStorage.removeItem('analysisStarted');
}

reset = () => {
  if (!confirm(translate('resetConfirmation'))) {
    return;
  }

  localStorage.removeItem('stats');
  localStorage.removeItem('duration');
  hide(statsElement);
  showStats();
  hide(resetButton);
}

init = () => {
  const selectedRegion = localStorage.getItem('selectedRegion');

  if (null !== selectedRegion) {
    userLocation = selectedRegion;
    selectRegion.value = selectedRegion;
  }

  if (null === localStorage.getItem('stats')) {
    hide(resetButton);
  } else {
    show(resetButton);
  }

  showStats();

  if (null === localStorage.getItem('analysisStarted')) {
    return;
  }

  start();
  statsInterval = setInterval(showStats, 2000);
}

selectRegionHandler = (event) => {
  const selectedRegion = event.target.value;

  if ('' === selectedRegion) {
    return;
  }

  localStorage.setItem('selectedRegion', selectedRegion);
  userLocation = selectedRegion;
  showStats();
}

translate = (translationKey) => {
  return chrome.i18n.getMessage(translationKey);
}

translateText = (target, translationKey) => {
  target.appendChild(document.createTextNode(translate(translationKey)));
}

translateHref = (target, translationKey) => {
  target.href = chrome.i18n.getMessage(translationKey);
}

hide = element => element.classList.add('hidden');
show = element => element.classList.remove('hidden');

const analysisInProgressMessage = document.getElementById('analysisInProgressMessage');

const statsElement = document.getElementById('stats');

const startButton = document.getElementById('startButton');
startButton.addEventListener('click', start);

const stopButton = document.getElementById('stopButton');
stopButton.addEventListener('click', stop);

const resetButton = document.getElementById('resetButton');
resetButton.addEventListener('click', reset);

const selectRegion = document.getElementById('selectRegion');
selectRegion.addEventListener('change', selectRegionHandler);

document.querySelectorAll('[translate]').forEach(function(element) {
  translateText(element, element.getAttribute('translate'));
});

document.querySelectorAll('[translate-href]').forEach(function(element) {
  translateHref(element, element.getAttribute('translate-href'));
});

init();
