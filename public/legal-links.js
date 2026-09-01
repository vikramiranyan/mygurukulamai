(() => {
  const mount = () => {
    if (document.getElementById('gurukulam-legal-links')) return;
    const nav = document.createElement('nav');
    nav.id = 'gurukulam-legal-links';
    nav.setAttribute('aria-label', 'Legal information');
    nav.innerHTML = '<a href="./privacy.html">Privacy</a><span aria-hidden="true">·</span><a href="./terms.html">Terms</a>';
    document.body.appendChild(nav);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
})();
