import { describe, expect, it } from 'vitest';
import { discoverLegitimateSources } from './sourceDiscovery';

describe('discoverLegitimateSources', () => {
  const metadata = { title: 'Mathematics', publisher: 'Example Publisher', grade: '5', subject: 'Maths' };

  it('accepts HTTPS publisher/school/library domains and ranks by confidence', () => {
    const result = discoverLegitimateSources(metadata, [() => [
      { url: 'https://library.example.library.org/book', title: 'Library copy', sourceType: 'library', confidence: 0.7 },
      { url: 'https://books.publisher.com/math', title: 'Publisher copy', sourceType: 'publisher', confidence: 0.95 },
      { url: 'http://publisher.com/insecure', title: 'Insecure', sourceType: 'publisher', confidence: 1 }
    ]]);
    expect(result.map((x) => x.title)).toEqual(['Publisher copy', 'Library copy']);
  });

  it('rejects malformed and untrusted URLs', () => {
    const result = discoverLegitimateSources(metadata, [() => [
      { url: 'https://random.example.com/book', title: 'Random', sourceType: 'other', confidence: 1 },
      { url: 'not-a-url', title: 'Broken', sourceType: 'other', confidence: 1 }
    ]]);
    expect(result).toEqual([]);
  });
});
