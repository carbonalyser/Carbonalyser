const translations = {
  'hello': {
    'fr': 'Bonjour !',
    'en': 'Hello!'
  }
};

const defaultGeolocation = 'European Union';
const userGeolocation = defaultGeolocation;

const kWhPerByte = 0.00000000152;
const OneKWhEquivalentKmByCar = 2.4;
const OneKWhEquivalentChargedSmartphones = 63;

const carbonIntensityFactorInKgCO2ePerKWh = {
  'European Union': '0.276',
  'United States': '0.493',
  'China': '0.681',
  'Other': '0.519'
};

const language = 'fr' === navigator.language.toLowerCase().substr(0, 2) ? 'fr' : 'en';
console.log(translations.hello[language]);

let statsInterval;
let pieChart;

handleResponse = message => {
  console.log(`Message from the background script:  ${message.response}`);
}

handleError = error => console.log(`Error: ${error}`);

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

  const highestStats = sortedStats.slice(0, 10);
  let subtotal = 0;
  for (let index in highestStats) {
    subtotal += highestStats[index].byte;
  }

  if (total > 0) {
    const remaining = total - subtotal;
    if (remaining > 0) {
      highestStats.push({'origin': 'Others', 'byte': remaining});
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

toMegaByte = (value) => (Math.round(100 * value/1024/1024) / 100) + ' Mb';

showStats = () => {
  const stats = getStats();

  let kWhTotal = 0;
  let kmByCar = 0;
  let chargedSmartphones = 0;
  let kgCO2e = 0;

  if (stats.total > 0) {
    show(statsElement);
    let list = '';
    const labels = [];
    const series = [];

    for (let index in stats.highestStats) {
      labels.push(stats.highestStats[index].percent > 5 ? stats.highestStats[index].origin : ' ');
      series.push(stats.highestStats[index].percent);
      list += `<li>${stats.highestStats[index].percent}% ${stats.highestStats[index].origin}</li>`;
    }

    kWhTotal = Math.round(1000 * stats.total * kWhPerByte) / 1000;
    kmByCar = Math.round(1000 * kWhTotal * OneKWhEquivalentKmByCar) / 1000;
    chargedSmartphones = Math.round(kWhTotal * OneKWhEquivalentChargedSmartphones);
    kgCO2e = Math.round(1000 * kWhTotal * carbonIntensityFactorInKgCO2ePerKWh[userGeolocation]) / 1000;
    listElement.innerHTML = `<ul>${list}</ul>`;

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
  }

  const html = `
    <p>Total: ${toMegaByte(stats.total)}</p>
    <p>${kWhTotal} kWh | ${kgCO2e} kgCO2e</p>
    <p>${kmByCar} km by car</p>
    <p>${chargedSmartphones} charged smartphones</p>
  `;
  equivalenceElement.innerHTML = html;
}

start = () => {
  const sending = browser.runtime.sendMessage({ action: 'start' });
  sending.then(handleResponse, handleError);
  hide(startButton);
  show(stopButton);
  show(analysisInProgressMessage);
  localStorage.setItem('analysisStarted', '1');
}

stop = () => {
  const sending = browser.runtime.sendMessage({ action: 'stop' });
  sending.then(handleResponse, handleError);
  hide(stopButton);
  show(startButton);
  hide(analysisInProgressMessage);
  clearInterval(statsInterval);
  localStorage.removeItem('analysisStarted');
}

reset = () => {
  if (!confirm('Are you sure?')) {
    return;
  }

  localStorage.removeItem('stats');
  hide(statsElement);
  showStats();
  hide(resetButton);
}

init = () => {
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

hide = element => element.classList.add('hidden');
show = element => element.classList.remove('hidden');

const analysisInProgressMessage = document.getElementById('analysisInProgressMessage');

const statsElement = document.getElementById('stats');
const listElement = document.getElementById('list');
const equivalenceElement = document.getElementById('equivalence');

const startButton = document.getElementById('startButton');
startButton.addEventListener('click', start);

const stopButton = document.getElementById('stopButton');
stopButton.addEventListener('click', stop);

const resetButton = document.getElementById('resetButton');
resetButton.addEventListener('click', reset);

init();
