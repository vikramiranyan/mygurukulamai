export type BookCoverMetadata = {
  title?: string;
  subtitle?: string;
  author?: string;
  publisher?: string;
  isbn?: string;
  grade?: string;
  subject?: string;
};

export type BookCandidate = BookCoverMetadata & { confidence: number; matchedFields: string[] };
const clean = (value: string | undefined): string => (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
const normalizedIsbn = (value: string | undefined): string => (value ?? '').replace(/[^0-9x]/gi, '').toLowerCase();
export function identifyBooksFromCover(cover: BookCoverMetadata, candidates: BookMetadataCandidate[], minimumConfidence = 0.55): BookCandidate[] {
  return candidates.map((candidate) => scoreBookCandidate(cover, candidate)).filter((candidate) => candidate.confidence >= minimumConfidence).sort((a,b) => b.confidence - a.confidence);
}
export type BookMetadataCandidate = BookCoverMetadata;
function scoreBookCandidate(cover: BookCoverMetadata, candidate: BookMetadataCandidate): BookCandidate {
  const matchedFields: string[] = [];
  let score = 0;
  let availableWeight = 0;
  if (cover.isbn && candidate.isbn) {
    availableWeight += 0.5;
    if (normalizedIsbn(cover.isbn) === normalizedIsbn(candidate.isbn)) { score += 0.5; matchedFields.push('isbn'); }
  }
  const fields: Array<[keyof BookCoverMetadata, number]> = [['title',0.25],['author',0.1],['publisher',0.08],['grade',0.04],['subject',0.03]];
  for (const [field, weight] of fields) {
    const left=clean(cover[field]); const right=clean(candidate[field]);
    if (!left || !right) continue;
    availableWeight += weight;
    if (left === right || left.includes(right) || right.includes(left)) { score += weight; matchedFields.push(field); }
  }
  const confidence = availableWeight === 0 ? 0 : Math.min(1, score / availableWeight);
  return {...candidate, confidence:Number(confidence.toFixed(3)), matchedFields};
}
