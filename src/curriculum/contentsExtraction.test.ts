import { describe, expect, it } from 'vitest';
import { extractContentsEntries } from './contentsExtraction';

describe('extractContentsEntries', () => {
  it('extracts chapter titles and page numbers', () => {
    expect(extractContentsEntries('1 Numbers ........ 5\n2 Addition ........ 17')).toEqual([
      { title: '1 Numbers', page: 5 },
      { title: '2 Addition', page: 17 }
    ]);
  });
});
