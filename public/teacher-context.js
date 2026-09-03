(() => {
  'use strict';
  const GUIDE_ID = 'gurukulam-immersive-layer';
  const STYLE_ID = 'gurukulam-teacher-context-style';
  const clean = (value, max = 160) => String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

  function teacherFromRow(row) {
    if (!row) return null;
    const name = clean(row.dataset.teacherName || row.querySelector('strong')?.textContent, 100);
    const subjects = clean(row.dataset.teacherSubjects || row.querySelector('small')?.textContent?.split(' · ')[0], 160);
    const role = clean(row.dataset.teacherRole || row.querySelector('small')?.textContent?.split(' · ').slice(1).join(' · '), 100) || 'Personal AI Teacher';
    if (!name) return null;
    return { name, subjects, role };
  }

  function teacherForCurrentSubject(page) {
    const teacherCard = page.querySelector('.quick-teachers');
    const activeSubject = clean(teacherCard?.dataset.activeSubject || page.querySelector('.subject-pill.active')?.dataset.subject || page.querySelector('.subject-pill.active')?.textContent, 100);
    const explicitActiveName = clean(teacherCard?.dataset.activeTeacher, 100);
    const rows = [...page.querySelectorAll('.quick-teachers .quick-list > div[data-teacher-name]')];
    const teachers = (rows.length ? rows : [...page.querySelectorAll('.quick-teachers .quick-list > div')]).map(teacherFromRow).filter(Boolean);
    if (!teachers.length) return null;
    if (explicitActiveName) return teachers.find(teacher => teacher.name === explicitActiveName) || null;
    if (!activeSubject) return null;
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
    const relevant = records.some(record => record.type === 'childList' || (record.type === 'attributes' && record.target instanceof Element && (record.target.matches('.subject-pill') || record.target.matches('.quick-teachers'))));
    if (relevant) queueRun();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-active-teacher', 'data-active-subject'] });
  window.addEventListener('load', queueRun, { once: true });
  queueRun();
})();
