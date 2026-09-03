import { describe, expect, it } from 'vitest';
import { nextPhase, recordSessionAnswer, scoreAnswers, startSession } from './learningSession';

describe('learning session', () => {
  it('starts a fresh child session', () => {
    const session = startSession('child-1', 'Maths', 'chapter-1');
    expect(session.phase).toBe('teach');
    expect(session.masteryScore).toBe(0);
    expect(session.streak).toBe(0);
    expect(session.startedAt).toBeGreaterThan(0);
  });
  it('weights hints and repeated attempts instead of treating every answer equally', () => {
    expect(scoreAnswers([{ questionId: '1', correct: true }, { questionId: '2', correct: true, hintUsed: true, attempts: 2 }])).toBeLessThan(100);
  });
  it('moves from practice to mastery at the intended threshold', () => {
    expect(nextPhase(59)).toBe('reteach');
    expect(nextPhase(60)).toBe('check');
    expect(nextPhase(85)).toBe('mastered');
  });
  it('updates streak and activity when an answer is recorded', () => {
    const session = startSession('child-1', 'Maths', 'chapter-1');
    const next = recordSessionAnswer(session, { questionId: 'q1', correct: true });
    expect(next.streak).toBe(1);
    expect(next.answers).toHaveLength(1);
    expect(next.lastActivityAt).toBeGreaterThanOrEqual(session.startedAt);
  });
});
