import { describe, expect, it } from 'vitest';
import { createParentChapterUpload } from './parentUpload';

describe('createParentChapterUpload', () => {
  it('creates an authoritative upload with normalized pages', () => {
    expect(createParentChapterUpload('mat-01', 'numbers.pdf', [8, 5, 8], '2026-08-28T00:00:00Z')).toEqual({
      chapterId: 'mat-01', fileName: 'numbers.pdf', pages: [5, 8], uploadedAt: '2026-08-28T00:00:00Z', authoritative: true
    });
  });
});
