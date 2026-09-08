import { describe, expect, it } from 'vitest';
import type { LearningProgress, LearningProgressEntry } from '../learningWorkspace';
import { mergeLearningProgress } from './driveLearningWorkspaceStore';

const entry = (updatedAt: number, chapterId = 'chapter-1'): LearningProgressEntry => ({
  subject: 'Math',
  chapterId,
  session: {
    childId: 'child-1',
    subject: 'Math',
    chapterId,
    phase: 'practice',
    answers: [{ questionId: 'q1', correct: true }],
    masteryScore: updatedAt,
    startedAt: updatedAt,
    lastActivityAt: updatedAt,
    streak: 1,
  },
  signals: [{ questionId: 'q1', correct: true }],
  updatedAt,
});

describe('mergeLearningProgress', () => {
  it('preserves existing entries missing from a stale incoming snapshot', () => {
    const existing: LearningProgress = {
      'Math|chapter-1': entry(200),
      'English|chapter-2': entry(150, 'chapter-2'),
    };

    const incoming: LearningProgress = {
      'Math|chapter-1': entry(100),
    };

    expect(mergeLearningProgress(existing, incoming)).toEqual(existing);
  });

  it('keeps the newer entry when both snapshots contain the same key', () => {
    const existing = { 'Math|chapter-1': entry(200) };
    const incoming = { 'Math|chapter-1': entry(300) };

    expect(mergeLearningProgress(existing, incoming)['Math|chapter-1'].updatedAt).toBe(300);
  });

  it('accepts new entries from the incoming snapshot', () => {
    const existing = { 'Math|chapter-1': entry(200) };
    const incoming = { 'English|chapter-2': entry(300, 'chapter-2') };

    expect(Object.keys(mergeLearningProgress(existing, incoming))).toEqual(['Math|chapter-1', 'English|chapter-2']);
  });
});
