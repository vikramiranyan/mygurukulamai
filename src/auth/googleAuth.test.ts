import {describe, expect, it} from 'vitest';
import {credentialToSession, isSessionValid, type AuthSession} from './googleAuth';

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

  it('rejects a credential with the wrong audience', () => {
    const payload = btoa(JSON.stringify({sub: '123', email: 'parent@example.com', exp: 20, aud: 'wrong', iss: 'https://accounts.google.com'}));
    const token = `header.${payload}.signature`;
    expect(credentialToSession(token, 'expected', 1_000)).toBeNull();
  });

  it('rejects an expired credential', () => {
    const payload = btoa(JSON.stringify({sub: '123', email: 'parent@example.com', exp: 1, aud: 'expected', iss: 'https://accounts.google.com'}));
    const token = `header.${payload}.signature`;
    expect(credentialToSession(token, 'expected', 2_000)).toBeNull();
  });

  it('creates a session from valid Google claims', () => {
    const payload = btoa(JSON.stringify({sub: '123', email: 'parent@example.com', name: 'Parent', exp: 20, aud: 'expected', iss: 'https://accounts.google.com'}));
    const token = `header.${payload}.signature`;
    const result = credentialToSession(token, 'expected', 1_000);
    expect(result?.user.id).toBe('123');
    expect(result?.user.email).toBe('parent@example.com');
    expect(result?.expiresAt).toBe(20_000);
  });
});
