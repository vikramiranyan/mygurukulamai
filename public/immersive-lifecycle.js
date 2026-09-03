(() => {
  'use strict';
  const HOST_ID = 'gurukulam-immersive-layer';

  function cleanup() {
    const host = document.getElementById(HOST_ID);
    if (host && !document.querySelector('.child-dashboard-v2')) {
      const guide = host.querySelector('.ga-guide');
      const timer = Number(guide?.dataset.timer);
      if (Number.isFinite(timer) && timer > 0) window.clearInterval(timer);
      host.remove();
    }
  }

  let queued = false;
  function queueCleanup() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; cleanup(); });
  }

  new MutationObserver(records => {
    if (records.some(record => record.type === 'childList')) queueCleanup();
  }).observe(document.documentElement, { childList: true, subtree: true });
  queueCleanup();
})();
