import { describe, expect, it } from 'vitest';
import { speechLanguage } from './hostedTutor';

describe('hosted tutor configuration', () => {
  it('maps supported tutor languages to Indian speech locales', () => {
    expect(speechLanguage('English')).toBe('en-IN');
    expect(speechLanguage('Hindi')).toBe('hi-IN');
    expect(speechLanguage('Tamil')).toBe('ta-IN');
    expect(speechLanguage('Telugu')).toBe('te-IN');
  });
});
