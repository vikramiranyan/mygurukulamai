import type { Chapter } from '../curriculum';

export type VerificationAction = 'approve' | 'replace-with-upload';

export type VerifiedChapter = Chapter & {
  sourceKind: 'publisher' | 'parent-upload';
  verifiedAt: string;
};

export function verifyChapter(chapter: Chapter, action: VerificationAction, now = new Date().toISOString()): VerifiedChapter | null {
  if (action === 'approve') {
    return { ...chapter, sourceKind: 'publisher', sourceStatus: 'approved', verifiedAt: now };
  }
  return null;
}

export function attachParentUpload(chapter: Chapter, pages: number[], now = new Date().toISOString()): VerifiedChapter {
  if (pages.length === 0) throw new Error('At least one uploaded page is required.');
  return {
    ...chapter,
    pages: [...pages].sort((a, b) => a - b),
    sourceKind: 'parent-upload',
    sourceStatus: 'parent_uploaded',
    verifiedAt: now
  };
}
