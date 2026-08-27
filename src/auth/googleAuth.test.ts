import {describe, expect, it} from 'vitest';
import {isSessionValid, type AuthSession} from './googleAuth';

const session: AuthSession = {
  user: {id: 'parent-1', email: 'parent@example.com', displayName: 'Parent', provider: 'google'},
  expiresAt: 2_000
};

describe('Google auth session validation', () => {
  it('accepts an unexpired session', () => {
    expect(isSessionValid(session, 1_000)).toBe(true);
  });

  it('rejects an expired-at-boundary session', () => {
    expect(isSessionValid(session, 2_000)).toBe(false);
  });

  it('rejects a missing session', () => {
    expect(isSessionValid(null, 1_000)).toBe(false);
  });
});
