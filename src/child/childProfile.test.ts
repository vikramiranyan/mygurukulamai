import {describe, expect, it} from 'vitest';
import {createChildProfile, setActiveChild} from './childProfile';

describe('child profile context', () => {
  it('creates a profile with safe defaults', () => {
    const child = createChildProfile({id: 'child-1', name: 'Learner', grade: 1});
    expect(child.preferredLanguage).toBe('English');
    expect(child.activeSubjects).toEqual([]);
    expect(child.strengths).toEqual([]);
    expect(child.needsPractice).toEqual([]);
  });

  it('selects the requested active child', () => {
    const children = [
      createChildProfile({id: 'child-1', name: 'One', grade: 1}),
      createChildProfile({id: 'child-2', name: 'Two', grade: 2})
    ];
    expect(setActiveChild(children, 'child-2')?.name).toBe('Two');
    expect(setActiveChild(children, 'missing')).toBeNull();
  });
});
