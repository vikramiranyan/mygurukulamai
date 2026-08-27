export type DocumentPage = { page: number; text: string; ocr: boolean };

/** Normalizes extracted/OCR text while retaining page provenance. */
export function ingestDocumentPages(pages: Array<{ page: number; text?: string; ocr?: boolean }>): DocumentPage[] {
  return pages.filter((p) => Number.isInteger(p.page) && p.page > 0).map((p) => ({
    page: p.page,
    text: (p.text ?? '').replace(/\s+/g, ' ').trim(),
    ocr: p.ocr === true
  })).sort((a, b) => a.page - b.page);
}
