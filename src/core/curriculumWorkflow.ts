import type { Chapter, Subject } from '../curriculum';

export type ChapterMatch = { chapter: Chapter; score: number };

export function searchChapters(query: string, curriculum: Record<Subject, Chapter[]>): ChapterMatch[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return [];
  return Object.values(curriculum)
    .flat()
    .map(chapter => {
      const title = chapter.title.toLocaleLowerCase();
      const score = title === needle ? 100 : title.includes(needle) ? 80 : 0;
      return { chapter, score };
    })
    .filter(match => match.score > 0)
    .sort((a, b) => b.score - a.score || a.chapter.title.localeCompare(b.chapter.title));
}

export function mapChapterPages(chapter: Chapter, firstPage: number, lastPage: number): Chapter {
  if (!Number.isInteger(firstPage) || !Number.isInteger(lastPage) || firstPage < 1 || lastPage < firstPage) {
    throw new Error('Invalid chapter page range.');
  }
  return { ...chapter, pages: Array.from({ length: lastPage - firstPage + 1 }, (_, i) => firstPage + i) };
}

export function trustedSource(chapter: Chapter): boolean {
  return chapter.sourceStatus === 'approved' || chapter.sourceStatus === 'parent_uploaded';
}
