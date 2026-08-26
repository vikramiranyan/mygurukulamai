export type SourceStatus = 'needs_verification' | 'approved' | 'parent_uploaded';

export type ChapterSource = {
  chapterId: string;
  pages: number[];
  status: SourceStatus;
};

export function canTeach(source: ChapterSource): boolean {
  return source.status === 'approved' || source.status === 'parent_uploaded';
}

export function approveSource(source: ChapterSource): ChapterSource {
  return { ...source, status: 'approved' };
}

export function replaceWithParentUpload(chapterId: string, pages: number[]): ChapterSource {
  return { chapterId, pages, status: 'parent_uploaded' };
}
