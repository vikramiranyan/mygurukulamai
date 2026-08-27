export type ContentsEntry = { title: string; page?: number };
export type ChapterPageRange = { title: string; startPage: number; endPage?: number };

/** Converts ordered contents entries into deterministic chapter page ranges. */
export function mapChapterPageRanges(entries: ContentsEntry[], finalPage?: number): ChapterPageRange[] {
  const withPages = entries.filter((entry): entry is ContentsEntry & { page: number } => Number.isInteger(entry.page) && entry.page! > 0);
  return withPages.map((entry, index) => ({
    title: entry.title,
    startPage: entry.page,
    endPage: withPages[index + 1]?.page ? withPages[index + 1].page - 1 : finalPage
  }));
}
