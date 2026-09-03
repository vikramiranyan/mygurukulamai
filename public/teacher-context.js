(() => {
  const GUIDE_ID = 'gurukulam-immersive-layer';
  const STYLE_ID = 'gurukulam-teacher-context-style';

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 160);
  }

  function teacherFromParentDashboard(page) {
    const teacherRow = page.querySelector('.quick-teachers .quick-list > div');
    const name = clean(teacherRow?.querySelector('strong')?.textContent);
    const details = clean(teacherRow?.querySelector('small')?.textContent);
    if (name) {
      const parts = details.split(' · ');
      return { name, subjects: parts[0] || '', role: parts.slice(1).join(' · ') || 'Personal AI Teacher' };
    }
    return null;
  }

  function applyContext() {
    const page = document.querySelector('.child-dashboard-v2');
    const guide = document.getElementById(GUIDE_ID);
    if (!page || !guide) return;

    const teacher = teacherFromParentDashboard(page);
    if (!teacher) {
      guide.hidden = true;
      guide.setAttribute('aria-hidden', 'true');
      return;
    }

    guide.hidden = false;
    guide.removeAttribute('aria-hidden');
    const greeting = guide.querySelector('.ga-greeting');
    const message = guide.querySelector('.ga-message');
    const badge = guide.querySelector('.ga-torso b');
    const toggle = guide.querySelector('.ga-toggle');
    const character = guide.querySelector('.ga-character');

    if (greeting) greeting.textContent = `Hi, ${teacher.name}! 👋`;
    if (message) message.textContent = teacher.role === 'Personal AI Teacher'
      ? `I am your ${teacher.name}. I will guide you step by step.`
      : `${teacher.role} · ${teacher.name}. I will guide you step by step.`;
    if (badge) badge.textContent = teacher.name.split(/\s+/).map(part => part[0]).join('').slice(0, 3).toUpperCase();
    if (toggle) toggle.setAttribute('aria-label', `Minimise ${teacher.name}`);
    if (character) character.setAttribute('aria-label', `${teacher.name}, ${teacher.role}`);
    guide.dataset.teacherName = teacher.name;
    guide.dataset.teacherRole = teacher.role;
    guide.dataset.teacherSubjects = teacher.subjects;
  }

  function mountStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `#${GUIDE_ID}[hidden]{display:none!important}`;
    document.head.appendChild(style);
  }

  function run() {
    mountStyle();
    applyContext();
  }

  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', run);
  window.setTimeout(run, 800);
})();
