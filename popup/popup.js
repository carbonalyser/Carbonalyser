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

getStats = () => {
  const stats = localStorage.getItem('stats');
  const statsParsed = null === stats ? {} : JSON.parse(stats);

  let html = '';

  for (let origin in statsParsed) {
    html += '<li>' + origin + ': ' + (Math.round(100 * statsParsed[origin]/1024/1024) / 100) + ' Mb</li>';
  }

  statsElement.innerHTML = '<ul>' + html + '</ul>'
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
  getStats();
  statsInterval = setInterval(getStats, 2000);

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
