import { describe, expect, it } from 'vitest';
import { mapChapterPageRanges } from './pageMapping';

describe('mapChapterPageRanges', () => {
  it('maps each chapter to the page before the next chapter', () => {
    expect(mapChapterPageRanges([
      { title: 'Numbers', page: 5 },
      { title: 'Addition', page: 17 },
      { title: 'Shapes', page: 29 }
    ], 40)).toEqual([
      { title: 'Numbers', startPage: 5, endPage: 16 },
      { title: 'Addition', startPage: 17, endPage: 28 },
      { title: 'Shapes', startPage: 29, endPage: 40 }
    ]);
  });
});
