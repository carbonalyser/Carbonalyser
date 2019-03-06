handleResponse = message => {
  console.log(`Message from the background script:  ${message.response}`);
}

handleError = error => console.log(`Error: ${error}`);

notifyBackgroundPage = () => {
  console.log('notifyBackgroundPage');
  const sending = browser.runtime.sendMessage({ action: 'start' });
  sending.then(handleResponse, handleError);
}

document.getElementById('go').addEventListener('click', notifyBackgroundPage);
