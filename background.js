// Clic en el icono de la extensión: abre la página en una pestaña.
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'newtab.html' });
});
