export type BookCoverMetadata = {
  title?: string;
  publisher?: string;
  isbn?: string;
  grade?: string;
  subject?: string;
};

export type CandidateSource = {
  url: string;
  title: string;
  sourceType: 'publisher' | 'school' | 'library' | 'other';
  confidence: number;
};

export type BookSourceMatch = {
  metadata: BookCoverMetadata;
  candidates: CandidateSource[];
};

/** Ranks already-discovered legitimate sources. Network discovery is deliberately
 * injected so the curriculum engine remains provider/platform independent. */
export function rankSources(candidates: CandidateSource[]): CandidateSource[] {
  return [...candidates].sort((a, b) => b.confidence - a.confidence);
}

export function bestSource(candidates: CandidateSource[]): CandidateSource | null {
  return rankSources(candidates)[0] ?? null;
}
