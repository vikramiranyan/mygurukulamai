import { describe, expect, it } from 'vitest';
import { ingestDocumentPages } from './documentIngestion';

describe('ingestDocumentPages', () => {
  it('normalizes whitespace, preserves page provenance, and sorts pages', () => {
    expect(ingestDocumentPages([
      { page: 3, text: '  plants   need water ', ocr: true },
      { page: 1, text: 'Title' }
    ])).toEqual([
      { page: 1, text: 'Title', ocr: false },
      { page: 3, text: 'plants need water', ocr: true }
    ]);
  });
});
