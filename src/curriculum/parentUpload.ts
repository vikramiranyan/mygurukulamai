export type UploadedChapter = {
  chapterId: string;
  fileName: string;
  pages: number[];
  uploadedAt: string;
  authoritative: true;
};

export function createParentChapterUpload(chapterId: string, fileName: string, pages: number[], now = new Date().toISOString()): UploadedChapter {
  if (!chapterId.trim()) throw new Error('chapterId is required');
  if (!fileName.trim()) throw new Error('fileName is required');
  if (pages.length === 0) throw new Error('At least one page is required');
  return { chapterId, fileName, pages: [...new Set(pages)].sort((a, b) => a - b), uploadedAt: now, authoritative: true };
}
