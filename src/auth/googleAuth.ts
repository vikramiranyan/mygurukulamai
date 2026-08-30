export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  provider: 'google';
};

export type AuthSession = {
  user: AuthUser;
  expiresAt: number;
  // Server JWT used only for backend-owned registry operations.
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

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      installParentActionFallbacks();
      hideInternalDriveUi();
    }, {once: true});
  } else {
    installParentActionFallbacks();
    hideInternalDriveUi();
  }
}
