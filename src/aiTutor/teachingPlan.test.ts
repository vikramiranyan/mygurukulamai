import { describe, expect, it } from 'vitest';
import { generateTeachingPlan, teachingPlanForScore } from './teachingPlan';

describe('teaching plan', () => {
  it('reteaches low mastery', () => {
    expect(teachingPlanForScore(40).mode).toBe('reteach');
  });

  it('uses practice for middle mastery', () => {
    expect(teachingPlanForScore(70).mode).toBe('practice');
  });

  it('advances high mastery', () => {
    expect(teachingPlanForScore(90).mode).toBe('advance');
  });

  it('clamps invalid numeric ranges', () => {
    expect(teachingPlanForScore(140).mode).toBe('advance');
    expect(teachingPlanForScore(-10).mode).toBe('reteach');
    expect(teachingPlanForScore(Number.NaN).mode).toBe('reteach');
  });

  it('keeps the core plan API stable', () => {
    expect(generateTeachingPlan({ subject: 'Maths', chapter: 'Numbers', concepts: ['Numbers'], profile: { mastery: 0 } }).checks).toBe(2);
  });
});
