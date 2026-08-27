import {isSessionValid, type AuthSession} from './googleAuth';

const session: AuthSession = {
  user: {id: 'parent-1', email: 'parent@example.com', displayName: 'Parent', provider: 'google'},
  expiresAt: 2_000
};

if (!isSessionValid(session, 1_000)) throw new Error('Expected an unexpired session to be valid');
if (isSessionValid(session, 2_000)) throw new Error('Expected an expired-at-boundary session to be invalid');
if (isSessionValid(null, 1_000)) throw new Error('Expected a missing session to be invalid');
