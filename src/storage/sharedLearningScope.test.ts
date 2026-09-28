import { describe, expect, it } from 'vitest';
import type { Child } from '../types/parent';
import { distinctLearningScopeGroups, sharedLearningScopeId } from './sharedLearningScope';

const child = (id: string, school: string, grade: string, section: string): Child => ({
  id,
  name: id,
  dob: '2015-01-01',
  gender: 'Other',
  grade,
  section,
  school,
  board: 'CBSE',
});

describe('shared learning scope groups', () => {
  it('groups children with the same school, class and section', () => {
    const groups = distinctLearningScopeGroups([
      child('kid-1', 'School A', '1', 'A'),
      child('kid-2', 'school a', ' 1 ', 'A'),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].children.map(item => item.id)).toEqual(['kid-1', 'kid-2']);
    expect(groups[0].id).toBe(sharedLearningScopeId(groups[0].representative));
  });

  it('keeps children in separate groups when any grouping field differs', () => {
    const groups = distinctLearningScopeGroups([
      child('kid-1', 'School A', '1', 'A'),
      child('kid-2', 'School A', '2', 'A'),
      child('kid-3', 'School A', '1', 'B'),
    ]);

    expect(groups).toHaveLength(3);
  });

  it('does not group children when grouping details are incomplete', () => {
    const groups = distinctLearningScopeGroups([
      child('kid-1', '', '1', 'A'),
      child('kid-2', '', '1', 'A'),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.map(group => group.id)).toEqual(['kid-1', 'kid-2']);
  });
});
