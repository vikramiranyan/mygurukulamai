import type { BookCoverMetadata } from '../core/bookIdentification';

export type ProposedChapter = { title: string; summary: string };
export const SMILE_ENGLISH_1_CHAPTERS = [
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
];
export type BookCoverProposal = BookCoverMetadata & {
  displayTitle: string;
  confidence: number;
  chapters: ProposedChapter[];
  sourceText: string;
  requiresContentsPage?: boolean;
  chapterSource?: 'contents' | 'catalog';
};

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function titleFromText(text: string): string {
  const lines = text.split(/\r?\n/).map(clean).filter(Boolean);
  const subjectLine = lines.find(line => /^(english|mathematics|maths|science|evs|hindi|computer science)$/i.test(line));
  const gradeMatch = text.match(/\b(?:grade|class)?\s*([1-9]|10|11|12)\b/i);
  const brand = lines.find(line => /^[a-z][a-z0-9 -]{2,20}$/i.test(line) && !/^(coursebook|workbook|textbook)$/i.test(line));
  if (subjectLine && gradeMatch) return clean(`${brand || ''} ${subjectLine} ${gradeMatch[1]} Coursebook`);
  const meaningful = lines
    .filter(line => !/^(coursebook|workbook|textbook|foundation curriculum)$/i.test(line))
    .filter(line => !/^(aligned with|powered by|learning a-z|sustainable development)/i.test(line));
  return clean(meaningful.slice(0, 3).join(' ')) || 'Untitled book';
}

export function createBookCoverProposal(sourceText: string, subject: string, grade?: string): BookCoverProposal {
  const normalized = sourceText.split(/\r?\n/).map(clean).filter(Boolean);
  const displayTitle = titleFromText(sourceText);
  const detectedChapters = normalized
    .filter(line => /^(chapter|unit|lesson)\s*\d+/i.test(line))
    .map(title => ({ title, summary: 'Review and add the chapter details before accepting.' }));
  const chapters = detectedChapters.length
    ? detectedChapters
    : [{ title: `${displayTitle} - contents to verify`, summary: 'AI could identify the book cover, but the chapter list needs parent verification.' }];
  return {
    displayTitle,
    title: displayTitle,
    subject,
    grade,
    confidence: Math.min(0.95, 0.45 + (displayTitle === 'Untitled book' ? 0 : 0.35) + (subject ? 0.1 : 0)),
    chapters,
    sourceText: sourceText.slice(0, 4000),
  };
}

export function createManualBookCoverProposal(subject: string, grade?: string): BookCoverProposal {
  const level = grade ? ` ${grade}` : '';
  const displayTitle = `SMILE ${subject}${level} Coursebook`;
  return {
    displayTitle,
    title: displayTitle,
    subject,
    grade,
    confidence: 0.45,
    chapters: [{ title: 'Upload the contents page to identify chapters', summary: 'The front cover identifies the book series, but does not show the chapter list. Upload a clear contents/index page to continue.' }],
    sourceText: '',
    requiresContentsPage: true,
  };
}

export function createCatalogChapterProposal(proposal: BookCoverProposal): BookCoverProposal | null {
  if (!/^smile english 1 coursebook$/i.test(proposal.displayTitle.trim())) return null;
  return {
    ...proposal,
    requiresContentsPage: false,
    chapterSource: 'catalog',
    chapters: SMILE_ENGLISH_1_CHAPTERS.map(title => ({
      title,
      summary: 'Matched from the verified SMILE English 1 contents catalog. Please compare with the uploaded contents page before accepting.',
    })),
  };
}
