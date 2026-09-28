import { describe, expect, it } from 'vitest';
import { createBookCoverProposal, createCatalogChapterProposal, createManualBookCoverProposal } from './bookCoverProposal';

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

  it('creates a safe review proposal when OCR is unavailable', () => {
    const proposal = createManualBookCoverProposal('English', '1');
    expect(proposal.displayTitle).toBe('SMILE English 1 Coursebook');
    expect(proposal.chapters[0].title).toContain('contents page');
    expect(proposal.confidence).toBeLessThan(0.5);
  });

  it('uses the verified SMILE English 1 catalog when contents OCR is unavailable', () => {
    const proposal = createCatalogChapterProposal(createManualBookCoverProposal('English', '1'));
    expect(proposal?.requiresContentsPage).toBe(false);
    expect(proposal?.chapters.map(chapter => chapter.title)).toEqual([
      'My Family',
      'I Want to Be',
      'The Day I Needed Help',
      'Too Many Bananas',
      'How the Elephant Got Its Trunk',
      'The Cow',
      'I Am Your New Plant',
      'The Empty Pot',
      'The Red Raincoat',
      'There Are Big Waves',
      'Golu Goes to Town',
      'My Planet',
      'Laundry Day',
      'A Good Play',
    ]);
  });
});
