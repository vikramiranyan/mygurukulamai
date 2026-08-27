import { describe, expect, it } from 'vitest';
import { identifyBooksFromCover } from './bookIdentification';

describe('identifyBooksFromCover', () => {
  it('prioritizes an exact ISBN match', () => {
    const results = identifyBooksFromCover(
      { title: 'Mathematics', isbn: '978-1-2345-6789-0', publisher: 'ABC' },
      [
        { title: 'Mathematics', isbn: '9781234567890', publisher: 'ABC' },
        { title: 'Mathematics', isbn: '978-9-9999-9999-9', publisher: 'ABC' }
      ]
    );

    expect(results[0].isbn).toBe('9781234567890');
    expect(results[0].matchedFields).toContain('isbn');
    expect(results[0].confidence).toBeGreaterThan(results[1].confidence);
  });

  it('uses descriptive metadata when ISBN is unavailable', () => {
    const results = identifyBooksFromCover(
      { title: 'Grade 5 Mathematics', author: 'A. Kumar', publisher: 'ABC' },
      [
        { title: 'Grade 5 Mathematics', author: 'A. Kumar', publisher: 'ABC' },
        { title: 'Grade 4 Mathematics', author: 'B. Kumar', publisher: 'XYZ' }
      ]
    );

    expect(results[0].title).toBe('Grade 5 Mathematics');
    expect(results[0].confidence).toBe(1);
  });

  it('does not return candidates when there is no usable metadata match', () => {
    const results = identifyBooksFromCover(
      { title: 'Unknown Book' },
      [{ title: 'Science', publisher: 'ABC' }]
    );

    expect(results).toEqual([]);
  });
});
