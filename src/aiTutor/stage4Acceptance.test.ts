import { describe, expect, it } from 'vitest';
import { generateTeachingPlan } from './teachingPlan';

describe('Stage 4 acceptance', () => {
  it('adapts teaching to mastery bands and produces checks', () => {
    const cases = [[0.2,'reteach'],[0.6,'practice'],[0.95,'advance']] as const;
    for (const [mastery, expected] of cases) {
      const plan = generateTeachingPlan({ subject:'Maths', chapter:'Fractions', concepts:['fractions'], profile:{mastery} });
      expect(plan.mode).toBe(expected);
      expect(plan.steps.length).toBeGreaterThanOrEqual(3);
      expect(plan.checks).toBeGreaterThan(0);
    }
  });
});
