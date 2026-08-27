import { describe, expect, it } from 'vitest';
import { extractContentsEntries } from './contentsExtraction';
import { mapChapterPageRanges } from './pageMapping';
import { identifyBook } from './bookIdentification';
describe('Stage 3 accuracy gates', () => {
 it('rejects ambiguous book matches', () => { const r=identifyBook({title:'Math'},[{title:'Science'}]); expect(r.match).toBeNull(); expect(r.confidence).toBe(0); });
 it('preserves ordered chapter boundaries', () => { const r=mapChapterPageRanges(extractContentsEntries('A ........ 5\nB ........ 10\nC ........ 20'),25); expect(r.map(x=>[x.startPage,x.endPage])).toEqual([[5,9],[10,19],[20,25]]); });
});
