import { describe, expect, it } from 'vitest';
import { starterCurriculum, teacherFor } from '../curriculum';
import { searchChapters, mapChapterPages, trustedSource } from './curriculumWorkflow';
import { buildTeachingPlan, diagnoseAnswer } from './tutorEngine';
import { greeting, teacherTurn } from './teacherEngine';
import { cueForTurn } from './animationRuntime';

describe('parallel implementation lanes', () => {
  it('keeps teacher assignment deterministic', () => {
    expect(teacherFor('Maths')).toBe('Vikram');
    expect(teacherFor('EVS')).toBe('Raji');
  });

  it('searches and maps curriculum chapters', () => {
    const matches = searchChapters('Addition', starterCurriculum);
    expect(matches[0]?.chapter.id).toBe('mat-02');
    const mapped = mapChapterPages(matches[0].chapter, 12, 15);
    expect(mapped.pages).toEqual([12, 13, 14, 15]);
    expect(trustedSource(mapped)).toBe(false);
  });

  it('builds child-level teaching plans and diagnoses answers', () => {
    const context = { subject: 'Maths', topic: 'Addition', learner: { id: 'c1', displayName: 'Child', grade: 1, preferredLanguage: 'English' as const }, sourcePages: [12] };
    expect(buildTeachingPlan(context).steps).toEqual(['explain', 'example', 'practice', 'check']);
    expect(diagnoseAnswer('')).toMatchObject({ kind: 'unknown' });
    expect(diagnoseAnswer('3')).toMatchObject({ kind: 'misconception' });
    expect(diagnoseAnswer('I understand addition')).toMatchObject({ kind: 'correct' });
  });

  it('produces teacher and animation runtime cues', () => {
    expect(greeting('Vikram', 'Aarav', 'Addition').text).toContain('I’m Vikram');
    expect(teacherTurn('Raji', 'reteach', 'Plants').turn).toBe('reteach');
    expect(cueForTurn('Raji', 'celebrate')).toMatchObject({ state: 'celebrating', intensity: 2 });
  });
});
