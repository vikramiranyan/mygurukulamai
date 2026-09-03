(() => {
  'use strict';
  const STYLE = 'gurukulam-child-experience-polish';
  let scheduled = false;
  let applying = false;
  const setText = (node, value) => { if (node && node.textContent !== value) node.textContent = value; };
  const apply = () => {
    scheduled = false;
    if (applying) return;
    const page = document.querySelector('.child-dashboard-v2');
    if (!page) return;
    applying = true;
    try {
      page.classList.add('child-experience-polished');
      setText(page.querySelector('.parent-access span'), 'Grown-ups');
      setText(page.querySelector('.dashboard-signout span'), 'Exit');
      setText(page.querySelector('.child-section-head h2'), "Today's Adventure 🌈");
      setText(page.querySelector('.section-path'), 'Pick an adventure');
      setText(page.querySelector('.learning-path-title h2'), 'Pick your adventure');
      setText(page.querySelector('.ai-teacher-card h2'), 'Talk to your teacher');
      setText(page.querySelector('.ai-teacher-card .ai-label'), '🗣️ YOUR TEACHER IS HERE');
      setText(page.querySelector('.ai-teacher-card .ai-input-row button'), 'Ask ✨');
      page.querySelectorAll('.path-block p').forEach(node => {
        const text = node.textContent || '';
        if (text.includes('No subjects are configured')) setText(node, 'Your learning adventures are being prepared. Ask a grown-up to choose your subjects. 🌱');
        if (text.includes('No chapter has been uploaded')) setText(node, 'Your next chapter is getting ready! You can choose another adventure or ask your teacher to help. ✨');
      });
      const guide = document.getElementById('gurukulam-immersive-layer');
      const hero = page.querySelector('.hero-art-wrap');
      if (guide && hero && guide.parentElement !== hero) hero.appendChild(guide);
    } finally {
      applying = false;
    }
  };
  const schedule = () => { if (scheduled) return; scheduled = true; requestAnimationFrame(apply); };
  const addStyle = () => {
    if (document.getElementById(STYLE)) return;
    const style = document.createElement('style'); style.id = STYLE; style.textContent = '.child-experience-polished{}'; document.head.appendChild(style);
  };
  addStyle();
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', schedule, { once: true });
  window.setTimeout(schedule, 250);
})();
