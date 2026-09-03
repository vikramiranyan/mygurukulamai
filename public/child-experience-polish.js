(() => {
  'use strict';
  const STYLE = 'gurukulam-child-experience-polish';
  const apply = () => {
    const page = document.querySelector('.child-dashboard-v2');
    if (!page) return;
    page.classList.add('child-experience-polished');

    const parentButton = page.querySelector('.parent-access span');
    if (parentButton) parentButton.textContent = 'Grown-ups';
    const signout = page.querySelector('.dashboard-signout span');
    if (signout) signout.textContent = 'Exit';

    const sectionTitle = page.querySelector('.child-section-head h2');
    if (sectionTitle) sectionTitle.textContent = "Today's Adventure 🌈";
    const sectionPath = page.querySelector('.section-path');
    if (sectionPath) sectionPath.textContent = 'Pick an adventure';

    const pathTitle = page.querySelector('.learning-path-title h2');
    if (pathTitle) pathTitle.textContent = 'Pick your adventure';

    const aiTitle = page.querySelector('.ai-teacher-card h2');
    if (aiTitle) aiTitle.textContent = 'Talk to your teacher';
    const aiLabel = page.querySelector('.ai-teacher-card .ai-label');
    if (aiLabel) aiLabel.textContent = '🗣️ YOUR TEACHER IS HERE';
    const aiButton = page.querySelector('.ai-teacher-card .ai-input-row button');
    if (aiButton) aiButton.textContent = 'Ask ✨';

    page.querySelectorAll('.path-block p').forEach(node => {
      const text = node.textContent || '';
      if (text.includes('No subjects are configured')) node.textContent = 'Your learning adventures are being prepared. Ask a grown-up to choose your subjects. 🌱';
      if (text.includes('No chapter has been uploaded')) node.textContent = 'Your next chapter is getting ready! You can choose another adventure or ask your teacher to help. ✨';
    });

    const guide = document.getElementById('gurukulam-immersive-layer');
    const hero = page.querySelector('.hero-art-wrap');
    if (guide && hero && guide.parentElement !== hero) {
      hero.appendChild(guide);
    }
  };

  const addStyle = () => {
    if (document.getElementById(STYLE)) return;
    const style = document.createElement('style');
    style.id = STYLE;
    style.textContent = '.child-experience-polished{}';
    document.head.appendChild(style);
  };

  const run = () => { addStyle(); apply(); };
  const observer = new MutationObserver(() => requestAnimationFrame(apply));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', run, { once: true });
  window.setTimeout(run, 250);
})();
