import { describe, expect, it } from 'vitest';
import { gradeAnswer } from './lessonContent';

describe('gradeAnswer', () => {
  it('rejects blank answers', () => {
    expect(gradeAnswer('', ['ball'])).toBe(false);
    expect(gradeAnswer('   ', ['ball'])).toBe(false);
  });

  it('matches an expected word without substring false positives', () => {
    expect(gradeAnswer('ball', ['ball'])).toBe(true);
    expect(gradeAnswer('I choose ball', ['ball'])).toBe(true);
    expect(gradeAnswer('balloon', ['ball'])).toBe(false);
    expect(gradeAnswer('not ball', ['ball'])).toBe(true);
  });

  it('treats numeric answers as tokens instead of substrings', () => {
    expect(gradeAnswer('5', ['5'])).toBe(true);
    expect(gradeAnswer('The answer is 5.', ['5'])).toBe(true);
    expect(gradeAnswer('15', ['5'])).toBe(false);
  });

  it('supports multi-word expected answers', () => {
    expect(gradeAnswer('The answer is New Delhi', ['new delhi'])).toBe(true);
    expect(gradeAnswer('New Delhi is correct', ['new delhi'])).toBe(true);
    expect(gradeAnswer('New Delhian', ['new delhi'])).toBe(false);
  });

  it('keeps free-response checks permissive but requires meaningful content', () => {
    expect(gradeAnswer('I learned', [])).toBe(true);
    expect(gradeAnswer('ab', [])).toBe(false);
    expect(gradeAnswer('...', [])).toBe(false);
  });
});
