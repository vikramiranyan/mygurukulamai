export type AuthenticatedParent = {
  id: string;
  email: string;
  displayName: string;
  provider: 'google';
};

export interface AuthGateway {
  signInWithGoogle(): Promise<AuthenticatedParent>;
  signOut(): Promise<void>;
  getCurrentParent(): Promise<AuthenticatedParent | null>;
}

/** Keeps UI independent from the eventual Google identity SDK. */
export const authConfig = {
  provider: 'google' as const,
  required: true
};
