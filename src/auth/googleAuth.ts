export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  provider: 'google';
};

export type AuthSession = {
  user: AuthUser;
  expiresAt: number;
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
