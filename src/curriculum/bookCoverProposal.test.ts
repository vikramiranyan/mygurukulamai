import { describe, expect, it } from 'vitest';
import { createBookCoverProposal } from './bookCoverProposal';

describe('createBookCoverProposal', () => {
  it('creates an editable title and chapter proposal from cover OCR', () => {
    const proposal = createBookCoverProposal('SMILE\nENGLISH\n1\nCOURSEBOOK', 'English', '1');

    expect(proposal.displayTitle).toContain('ENGLISH');
    expect(proposal.chapters).toHaveLength(1);
    expect(proposal.chapters[0].title).toContain('contents to verify');
  });

  it('uses detected chapter headings when OCR includes them', () => {
    const proposal = createBookCoverProposal('Science Grade 5\nChapter 1 Plants\nChapter 2 Animals', 'Science', '5');

    expect(proposal.chapters.map(chapter => chapter.title)).toEqual(['Chapter 1 Plants', 'Chapter 2 Animals']);
  });
});
