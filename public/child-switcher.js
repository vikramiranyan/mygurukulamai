(() => {
  const SESSION_KEY = 'gurukulam-auth-session';
  const CHILDREN_KEY_PREFIX = 'gurukulam:';
  const ACTIVE_KEY_SUFFIX = ':active-child';
  const STYLE_ID = 'gurukulam-child-switcher-style';
  const SELECT_ID = 'gurukulam-child-switcher';

  function getUserId() {
    try {
      const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
      return session?.user?.id || '';
    } catch { return ''; }
  }

  function readChildren(userId) {
    try {
      const value = JSON.parse(localStorage.getItem(`${CHILDREN_KEY_PREFIX}${encodeURIComponent(userId)}:children`) || '[]');
      return Array.isArray(value) ? value.filter(child => child && child.id && child.name) : [];
    } catch { return []; }
  }

  function inject() {
    const actions = document.querySelector('.child-top-actions');
    const userId = getUserId();
    if (!actions || !userId) return;
    const children = readChildren(userId);
    if (!children.length) return;

    let wrapper = document.getElementById(SELECT_ID);
    if (wrapper) {
      const select = wrapper.querySelector('select');
      if (select && select.value !== (localStorage.getItem(`${CHILDREN_KEY_PREFIX}${encodeURIComponent(userId)}${ACTIVE_KEY_SUFFIX}`) || children[0].id)) {
        select.value = localStorage.getItem(`${CHILDREN_KEY_PREFIX}${encodeURIComponent(userId)}${ACTIVE_KEY_SUFFIX}`) || children[0].id;
      }
      return;
    }

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        .gurukulam-child-switcher{display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid rgba(34,88,76,.16);border-radius:14px;background:rgba(255,255,255,.9);box-shadow:0 5px 18px rgba(34,88,76,.08)}
        .gurukulam-child-switcher-label{font-size:11px;font-weight:800;letter-spacing:.06em;color:#5c746d;white-space:nowrap}
        .gurukulam-child-switcher select{border:0;outline:0;background:transparent;font:inherit;font-weight:800;color:#173d35;min-width:125px;cursor:pointer}
        @media(max-width:720px){.gurukulam-child-switcher{padding:6px 8px}.gurukulam-child-switcher-label{display:none}.gurukulam-child-switcher select{min-width:110px;max-width:135px}}
      `;
      document.head.appendChild(style);
    }

    wrapper = document.createElement('div');
    wrapper.id = SELECT_ID;
    wrapper.className = 'gurukulam-child-switcher';
    wrapper.setAttribute('aria-label', 'Switch child');

    const label = document.createElement('span');
    label.className = 'gurukulam-child-switcher-label';
    label.textContent = 'CHILD';

    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Select child');
    const activeId = localStorage.getItem(`${CHILDREN_KEY_PREFIX}${encodeURIComponent(userId)}${ACTIVE_KEY_SUFFIX}`) || children[0].id;
    children.forEach(child => {
      const option = document.createElement('option');
      option.value = child.id;
      option.textContent = child.name;
      select.appendChild(option);
    });
    select.value = children.some(child => child.id === activeId) ? activeId : children[0].id;
    localStorage.setItem(`${CHILDREN_KEY_PREFIX}${encodeURIComponent(userId)}${ACTIVE_KEY_SUFFIX}`, select.value);
    select.addEventListener('change', () => {
      localStorage.setItem(`${CHILDREN_KEY_PREFIX}${encodeURIComponent(userId)}${ACTIVE_KEY_SUFFIX}`, select.value);
      window.location.reload();
    });

    wrapper.append(label, select);
    actions.prepend(wrapper);
  }

  const observer = new MutationObserver(inject);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', inject);
  setTimeout(inject, 300);
})();
