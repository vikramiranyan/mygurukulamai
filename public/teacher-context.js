(() => {
  'use strict';
  const GUIDE_ID = 'gurukulam-immersive-layer';
  const STYLE_ID = 'gurukulam-teacher-context-style';
  const clean = (value, max = 160) => String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

  function teacherFromRow(row) {
    if (!row) return null;
    const name = clean(row.querySelector('strong')?.textContent, 100);
    const details = clean(row.querySelector('small')?.textContent, 160);
    if (!name) return null;
    const parts = details.split(' · ');
    return { name, subjects: parts[0] || '', role: parts.slice(1).join(' · ') || 'Personal AI Teacher' };
  }

  function teacherForCurrentSubject(page) {
    const activeSubject = clean(page.querySelector('.subject-pill.active')?.textContent, 100);
    const teachers = [...page.querySelectorAll('.quick-teachers .quick-list > div')].map(teacherFromRow).filter(Boolean);
    if (!teachers.length) return null;
    if (!activeSubject) return teachers[0];
    return teachers.find(teacher => teacher.subjects.split(',').map(item => clean(item, 100)).includes(activeSubject)) || null;
  }

  function applyContext() {
    const page = document.querySelector('.child-dashboard-v2');
    const guide = document.getElementById(GUIDE_ID);
    if (!page || !guide) return;
    const teacher = teacherForCurrentSubject(page);
    if (!teacher) {
      guide.hidden = true;
      guide.setAttribute('aria-hidden', 'true');
      delete guide.dataset.teacherName;
      delete guide.dataset.teacherRole;
      delete guide.dataset.teacherSubjects;
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
    if (message) message.textContent = teacher.role === 'Personal AI Teacher' ? `I am your ${teacher.name}. I will guide you step by step.` : `${teacher.role} · ${teacher.name}. I will guide you step by step.`;
    if (badge) badge.textContent = teacher.name.split(/\s+/).map(part => part[0]).join('').slice(0, 3).toUpperCase();
    if (toggle) toggle.setAttribute('aria-label', `Minimise ${teacher.name}`);
    if (character) character.setAttribute('aria-label', `${teacher.name}, ${teacher.role}`);
    guide.dataset.teacherName = teacher.name;
    guide.dataset.teacherRole = teacher.role;
    guide.dataset.teacherSubjects = teacher.subjects;
  }

  function run() {
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `#${GUIDE_ID}[hidden]{display:none!important}`;
      document.head.appendChild(style);
    }
    applyContext();
  }

  let queued = false;
  const queueRun = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; run(); });
  };
  const observer = new MutationObserver(records => {
    if (records.some(record => record.type === 'childList' || [...record.addedNodes].some(node => node.nodeType === 1 && (node.matches?.('.child-dashboard-v2, .subject-pill, .quick-teachers') || node.querySelector?.('.child-dashboard-v2, .subject-pill, .quick-teachers'))))) queueRun();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', queueRun, { once: true });
  queueRun();
})();
