import { describe, expect, it } from 'vitest';
import { starterCurriculum } from '../curriculum';
import { searchChapters, mapChapterPages, trustedSource } from './curriculumWorkflow';
import { buildTeachingPlan, diagnoseAnswer } from './tutorEngine';
import { greeting, teacherTurn } from './teacherEngine';
import { cueForTurn } from './animationRuntime';

describe('parallel implementation lanes', () => {
  it('does not hardcode teacher assignment into curriculum', () => {
    expect(starterCurriculum.Maths[1]).not.toHaveProperty('teacher');
    expect(starterCurriculum.EVS[0]).not.toHaveProperty('teacher');
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

  it('produces teacher and animation runtime cues for a supplied teacher name', () => {
    expect(greeting('Teacher A', 'Aarav', 'Addition').text).toContain('I’m Teacher A');
    expect(teacherTurn('Teacher B', 'reteach', 'Plants').turn).toBe('reteach');
    expect(cueForTurn('Teacher B', 'celebrate')).toMatchObject({ state: 'celebrating', intensity: 2 });
  });
});
