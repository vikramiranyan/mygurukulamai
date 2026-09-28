import { describe, expect, it } from 'vitest';
import { hostedTutorUrl, speechLanguage } from './hostedTutor';

describe('hosted tutor configuration', () => {
  it('uses the production tutor Worker when no build-time URL is supplied', () => {
    expect(hostedTutorUrl()).toBe('https://tutor.gurukulam-ai.workers.dev');
  });

  it('maps supported tutor languages to Indian speech locales', () => {
    expect(speechLanguage('English')).toBe('en-IN');
    expect(speechLanguage('Hindi')).toBe('hi-IN');
    expect(speechLanguage('Tamil')).toBe('ta-IN');
    expect(speechLanguage('Telugu')).toBe('te-IN');
  });
});
