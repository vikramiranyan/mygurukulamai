(() => {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    const swUrl = new URL('./sw.js', document.baseURI).toString();
    navigator.serviceWorker.register(swUrl, { scope: './' }).catch(() => {
      // PWA support is progressive enhancement; app operation must continue if SW registration fails.
    });
  });
})();
