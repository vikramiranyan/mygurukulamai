import type { BookCoverMetadata, CandidateSource } from './bookSource';

export type SourceDiscoveryProvider = (metadata: BookCoverMetadata) => CandidateSource[];

const trustedHostPattern = /(^|\.)(publisher|school|edu|ac|library)\.[a-z.]+$/i;

/** Keep discovery deterministic and provider-independent; callers inject network results. */
export function discoverLegitimateSources(
  metadata: BookCoverMetadata,
  providers: SourceDiscoveryProvider[] = []
): CandidateSource[] {
  const candidates = providers.flatMap((provider) => provider(metadata));
  return candidates
    .filter((candidate) => {
      try {
        const url = new URL(candidate.url);
        return url.protocol === 'https:' && trustedHostPattern.test(url.hostname);
      } catch {
        return false;
      }
    })
    .sort((a, b) => b.confidence - a.confidence);
}
