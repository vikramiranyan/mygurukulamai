import { describe, expect, it } from 'vitest';
import { identifyBook, type BookCover } from './bookIdentification';
import { discoverLegitimateSources } from './sourceDiscovery';
import { extractContentsEntries } from './contentsExtraction';
import { mapChapterPageRanges } from './pageMapping';
import { createParentChapterUpload } from './parentUpload';
import { ingestDocumentPages } from './documentIngestion';
import { extractConcepts } from './concepts';
import { canTeachFromSource, replaceWithParentUpload, type CurriculumSource } from '../core/curriculumSource';

describe('Stage 3 curriculum acceptance', () => {
  const cover: BookCover = { title: 'Mathematics', publisher: 'Example Publisher', isbn: '9781234567890', grade: '5', subject: 'Maths' };
  it('supports the complete source-to-curriculum pipeline', () => {
    const book = identifyBook(cover, [{ title: 'Mathematics', publisher: 'Example Publisher', isbn: '9781234567890', grade: '5', subject: 'Maths' }]);
    expect(book.match).not.toBeNull(); expect(book.confidence).toBe(1);
    const sources = discoverLegitimateSources(cover, [() => [{ url: 'https://books.publisher.com/math', title: 'Publisher book', sourceType: 'publisher', confidence: 0.95 }]]);
    expect(sources).toHaveLength(1);
    const ranges = mapChapterPageRanges(extractContentsEntries('1 Numbers ........ 5\n2 Addition ........ 17'), 30);
    expect(ranges).toEqual([{ title: '1 Numbers', startPage: 5, endPage: 16 }, { title: '2 Addition', startPage: 17, endPage: 30 }]);
    const upload = createParentChapterUpload('mat-01', 'numbers.pdf', [5, 6, 7], '2026-08-28T00:00:00Z');
    expect(upload.authoritative).toBe(true);
    const pages = ingestDocumentPages([{ page: 5, text: 'Numbers and addition', ocr: true }]);
    expect(pages[0].text).toBe('Numbers and addition');
    expect(extractConcepts(pages[0].text).map(c => c.name)).toContain('numbers');
    const source: CurriculumSource = { chapterId: 'mat-01', status: 'needs_verification', pages: [] };
    const parentSource = replaceWithParentUpload(source, upload.fileName, upload.pages);
    expect(parentSource.status).toBe('parent_uploaded'); expect(canTeachFromSource(parentSource)).toBe(true);
  });
});
