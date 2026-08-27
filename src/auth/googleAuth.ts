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

export interface GoogleAuthAdapter {
  signIn(): Promise<AuthSession>;
  signOut(): Promise<void>;
  restoreSession(): Promise<AuthSession | null>;
}

export function isSessionValid(session: AuthSession | null, now = Date.now()): boolean {
  return Boolean(session && session.expiresAt > now);
}
