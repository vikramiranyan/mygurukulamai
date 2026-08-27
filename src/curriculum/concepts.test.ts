import { describe, expect, it } from 'vitest';
import { extractConcepts } from './concepts';

describe('extractConcepts', () => {
  it('extracts repeated meaningful terms deterministically', () => {
    expect(extractConcepts('Plants need water. Plants need sunlight. Water helps plants grow.', 3).map(x => x.name)).toEqual(['plants','water','grow']);
  });
});
