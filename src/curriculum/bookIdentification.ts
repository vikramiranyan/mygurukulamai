export type BookCover = {
  title?: string;
  publisher?: string;
  isbn?: string;
  grade?: string;
  subject?: string;
};

export type BookCandidate = BookCover;
export type BookIdentification = { match: BookCandidate | null; confidence: number };

const normalize = (value?: string) => (value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');

export function identifyBook(cover: BookCover, candidates: BookCandidate[]): BookIdentification {
  const isbn = normalize(cover.isbn);
  if (isbn) {
    const exact = candidates.find(c => normalize(c.isbn) === isbn);
    if (exact) return { match: exact, confidence: 1 };
  }
  let best: BookCandidate | null = null;
  let bestScore = 0;
  for (const candidate of candidates) {
    let score = 0; let fields = 0;
    for (const key of ['title', 'publisher', 'grade', 'subject'] as const) {
      const a = normalize(cover[key]); const b = normalize(candidate[key]);
      if (a) { fields++; if (a === b) score++; }
    }
    const confidence = fields ? score / fields : 0;
    if (confidence > bestScore) { bestScore = confidence; best = candidate; }
  }
  return { match: bestScore >= 0.75 ? best : null, confidence: bestScore };
}
