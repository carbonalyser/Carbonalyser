const translations = {
  'hello': {
    'fr': 'Bonjour !',
    'en': 'Hello!'
  }
};

const language = 'fr' === navigator.language.toLowerCase().substr(0, 2) ? 'fr' : 'en';
console.log(translations.hello[language]);

let statsInterval;

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

  let html = '';

  for (let index in stats.highestStats) {
    html += `<li>${stats.highestStats[index].percent}% ${stats.highestStats[index].origin}</li>`;
  }

  html = `<p>Total: ${toMegaByte(stats.total)}</p><ul>${html}</ul>`;

  statsElement.innerHTML = html;
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

init = () => {
  showStats();
  statsInterval = setInterval(showStats, 2000);

  if (null === localStorage.getItem('analysisStarted')) {
    return;
  }

  start();
}

hide = element => element.classList.add('hidden');
show = element => element.classList.remove('hidden');

const analysisInProgressMessage = document.getElementById('analysisInProgressMessage');

const statsElement = document.getElementById('stats');

const startButton = document.getElementById('startButton');
startButton.addEventListener('click', start);

const stopButton = document.getElementById('stopButton');
stopButton.addEventListener('click', stop);

init();
