import { describe, expect, it } from 'vitest';
import { diagnoseMistake, recommendNextStep, remediationMessage, scoreLearningSignals } from './adaptiveLearning';

describe('adaptive learning intelligence', () => {
  it('scores hints and repeated attempts conservatively', () => {
    expect(scoreLearningSignals([{ correct: true }, { correct: true, hintUsed: true, attempts: 2 }])).toBe(90);
  });

  it('recommends reteaching after repeated failure', () => {
    const result = recommendNextStep([{ correct: false }, { correct: false }], 0.4);
    expect(result.band).toBe('reteach');
    expect(result.nextStep).toBe('reteach');
  });

  it('advances stable mastery', () => {
    const result = recommendNextStep([{ correct: true }, { correct: true }, { correct: true }], 0.9);
    expect(result.band).toBe('advance');
    expect(result.nextStep).toBe('challenge');
  });

  it('distinguishes blank, near-miss and concept gap', () => {
    expect(diagnoseMistake('', ['ball'])).toBe('blank');
    expect(diagnoseMistake('bal', ['ball'])).toBe('near-miss');
    expect(diagnoseMistake('moon', ['ball'])).toBe('concept-gap');
    expect(remediationMessage('letter sounds', 'near-miss')).toContain('close');
  });
});
