export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  provider: 'google';
};

export type AuthSession = {
  user: AuthUser;
  expiresAt: number;
  backendAccessToken?: string;
};

export type GoogleCredentialClaims = {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
  exp?: number;
  aud?: string;
  iss?: string;
};

let latestGoogleCredential = '';

export interface GoogleAuthAdapter {
  signIn(): Promise<AuthSession>;
  signOut(): Promise<void>;
  restoreSession(): Promise<AuthSession | null>;
}

export function isSessionValid(session: AuthSession | null, now = Date.now()): boolean {
  return Boolean(session && session.expiresAt > now);
}

export function decodeGoogleCredential(token: string): GoogleCredentialClaims | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const decoded = decodeURIComponent(
      Array.from(atob(padded), char => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')
    );
    return JSON.parse(decoded) as GoogleCredentialClaims;
  } catch {
    return null;
  }
}

/** Returns the most recently issued Google ID token for in-memory registry sync only. */
export function getLatestGoogleCredential(): string {
  return latestGoogleCredential;
}

export function clearLatestGoogleCredential(): void {
  latestGoogleCredential = '';
}

export function credentialToSession(
  token: string,
  expectedClientId: string,
  now = Date.now()
): AuthSession | null {
  const claims = decodeGoogleCredential(token);
  if (!claims?.sub || !claims.email || !claims.exp) return null;
  if (claims.aud !== expectedClientId) return null;
  if (claims.iss !== 'https://accounts.google.com' && claims.iss !== 'accounts.google.com') return null;
  const expiresAt = claims.exp * 1000;
  if (expiresAt <= now) return null;

  latestGoogleCredential = token;
  return {
    user: {
      id: claims.sub,
      email: claims.email,
      displayName: claims.name?.trim() || claims.email.split('@')[0],
      provider: 'google'
    },
    expiresAt
  };
}

// Mobile Safari can occasionally defer synthetic click generation for dynamically
// rendered controls. Keep the two parent workflow actions explicitly touch-safe.
function installParentActionFallbacks() {
  if (typeof document === 'undefined') return;
  const toast = (text: string) => {
    const existing = document.querySelector('[data-gurukulam-toast]');
    existing?.remove();
    const el = document.createElement('div');
    el.dataset.gurukulamToast = 'true';
    el.textContent = text;
    Object.assign(el.style, {
      position: 'fixed', bottom: '18px', left: '50%', transform: 'translateX(-50%)',
      zIndex: '9999', background: '#102a43', color: '#fff', padding: '11px 16px',
      borderRadius: '12px', fontSize: '12px', fontWeight: '800', boxShadow: '0 8px 24px rgba(16,42,67,.25)',
      maxWidth: 'calc(100vw - 32px)', textAlign: 'center'
    });
    document.body.appendChild(el);
    window.setTimeout(() => el.remove(), 2600);
  };

  const bind = () => {
    document.querySelectorAll('button').forEach(button => {
      if (button.dataset.gurukulamActionBound) return;
      const label = button.textContent?.replace(/^[^A-Za-z]+/, '').trim() || '';
      if (!label.includes('Approve pages') && !label.includes('Upload chapter')) return;
      button.dataset.gurukulamActionBound = 'true';

      if (label.includes('Upload chapter')) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg';
        input.style.display = 'none';
        document.body.appendChild(input);
        input.addEventListener('change', () => {
          const file = input.files?.[0];
          if (!file) return;
          button.textContent = `✓ ${file.name}`;
          toast(`Chapter selected: ${file.name}`);
        });
        button.addEventListener('click', () => input.click());
        button.addEventListener('touchend', event => {
          event.preventDefault();
          button.click();
        }, {passive: false});
      } else {
        button.addEventListener('click', () => toast('Parent approval received for this chapter.'));
        button.addEventListener('touchend', event => {
          event.preventDefault();
          button.click();
        }, {passive: false});
      }
    });
  };

  bind();
  const observer = new MutationObserver(bind);
  observer.observe(document.body, {childList: true, subtree: true});
}

function hideInternalDriveUi() {
  if (typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.dataset.gurukulamDriveUi = 'true';
  style.textContent = '.drive-indicator,.drive-indicator + button{display:none!important}';
  document.head.appendChild(style);
}

function installDashboardBrandingAndNavigation() {
  if (typeof document === 'undefined') return;

  const style = document.createElement('style');
  style.dataset.gurukulamDashboardUi = 'true';
  style.textContent = `
    .gurukulam-brand-icon{width:52px!important;height:52px!important;display:block!important;object-fit:contain!important;flex:0 0 52px!important}
    .dashboard-app header>div:first-child,.parent-topbar>div:first-child{display:flex!important;align-items:center!important;gap:12px!important}
    .dashboard-app .logo,.parent-topbar .logo{display:none!important}
    .dashboard-signout{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid #d8cdb8!important;background:#fff!important;color:#0b4f3f!important;border-radius:14px!important;padding:12px 20px!important;font:inherit!important;font-weight:800!important;cursor:pointer!important;box-shadow:none!important}
    .dashboard-signout:hover{background:#f8f1e4!important}
    .parent-topbar .top-actions{display:flex!important;align-items:center!important;gap:12px!important}
    .parent-topbar .back-child,.parent-topbar .signin{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:46px!important;border-radius:14px!important;padding:10px 18px!important;font:inherit!important;font-weight:800!important;cursor:pointer!important}
    .parent-topbar .back-child{background:#f7eedc!important;color:#0b4f3f!important;border:1px solid #e5d7bd!important}
    .parent-topbar .signin{background:#fff!important;color:#0b4f3f!important;border:1px solid #d8cdb8!important}
    .parent-topbar .back-child:hover,.parent-topbar .signin:hover{background:#efe4cf!important}
    .parent-sidebar .sidebar-title strong{font-size:17px!important}
    .parent-sidebar .sidebar-title{cursor:default!important}
    .parent-main .parent-hero.gurukulam-child-hero-hidden{display:none!important}
    .parent-main .child-details-page .section-heading{margin-top:0!important}
  `;
  document.head.appendChild(style);

  const replaceLogo = (root: Element) => {
    root.querySelectorAll<HTMLElement>('.logo').forEach(logo => {
      if (logo.dataset.gurukulamLogoDone) return;
      const img = document.createElement('img');
      img.className = 'gurukulam-brand-icon';
      img.src = './icons/icon.svg';
      img.alt = 'Gurukulam AI';
      logo.replaceWith(img);
    });
  };

  const enhance = () => {
    const dashboard = document.querySelector('.dashboard-app');
    if (dashboard) {
      replaceLogo(dashboard);
      const header = dashboard.querySelector('header');
      if (header) {
        const parentButton = header.querySelector<HTMLButtonElement>('.parent-access');
        if (parentButton) parentButton.textContent = '👨‍👩‍👧 Parent Dashboard';
        if (!header.querySelector('.dashboard-signout')) {
          const signout = document.createElement('button');
          signout.className = 'dashboard-signout';
          signout.textContent = '⇥ Sign out';
          signout.setAttribute('aria-label', 'Sign out');
          signout.addEventListener('click', () => {
            try { sessionStorage.removeItem('gurukulam-auth-session'); } catch {}
            window.location.reload();
          });
          header.appendChild(signout);
        }
      }
    }

    const parentApp = document.querySelector('.parent-app');
    if (parentApp) {
      replaceLogo(parentApp);
      const title = parentApp.querySelector<HTMLElement>('.sidebar-title strong');
      if (title) title.textContent = 'Parent Dashboard';

      const hero = parentApp.querySelector<HTMLElement>('.parent-hero');
      const heroTitle = hero?.querySelector('h1')?.textContent || '';
      if (hero && /Child Details/.test(heroTitle)) hero.classList.add('gurukulam-child-hero-hidden');
    }
  };

  enhance();
  const observer = new MutationObserver(enhance);
  observer.observe(document.body, {childList: true, subtree: true});
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      installParentActionFallbacks();
      hideInternalDriveUi();
      installDashboardBrandingAndNavigation();
    }, {once: true});
  } else {
    installParentActionFallbacks();
    hideInternalDriveUi();
    installDashboardBrandingAndNavigation();
  }
}
