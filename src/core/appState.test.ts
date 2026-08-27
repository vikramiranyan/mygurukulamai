import {describe, expect, it} from 'vitest';
import {defaultAppState, hashForRoute, routeFromHash} from './appState';
import {emptyState, errorState, loadingState, readyState} from './foundation';

describe('foundation application state', () => {
  it('provides a deterministic default parent route', () => {
    expect(defaultAppState.route).toBe('parent');
    expect(defaultAppState.activeSubject).toBe('Maths');
  });

  it('round-trips application routes through the URL hash', () => {
    expect(routeFromHash(hashForRoute('parent'))).toBe('parent');
    expect(routeFromHash(hashForRoute('learning'))).toBe('learning');
  });

  it('provides explicit async lifecycle states', () => {
    expect(loadingState().status).toBe('loading');
    expect(readyState({ok: true}).data).toEqual({ok: true});
    expect(emptyState().status).toBe('empty');
    expect(errorState('failed').error).toBe('failed');
  });
});
