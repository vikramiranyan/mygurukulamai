export type SourceStatus = 'needs_verification' | 'approved' | 'parent_uploaded';

export type CurriculumSource = {
  chapterId: string;
  status: SourceStatus;
  pages: number[];
  sourceName?: string;
  uploadedAt?: string;
};

export function approveSource(source: CurriculumSource): CurriculumSource {
  return { ...source, status: 'approved' };
}

export function replaceWithParentUpload(source: CurriculumSource, sourceName: string, pages: number[]): CurriculumSource {
  return { ...source, status: 'parent_uploaded', sourceName, pages, uploadedAt: new Date().toISOString() };
}

export function canTeachFromSource(source: CurriculumSource): boolean {
  return source.status === 'approved' || source.status === 'parent_uploaded';
}
