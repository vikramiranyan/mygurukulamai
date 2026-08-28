export const PRODUCTION_RULES = {
  requireGoogleSession: true,
  isolateChildDataByUser: true,
  requireParentApprovalForTeaching: true,
  viewChapterInBrowserOnly: true,
  noLocalChapterDownload: true,
  voiceFailureMustRecover: true,
} as const;

export function scopedStorageKey(userId: string, childId: string, key: string): string {
  return `gurukulam:${encodeURIComponent(userId)}:${encodeURIComponent(childId)}:${key}`;
}

export function canStartTeaching(approved: boolean, authenticated: boolean): boolean {
  return authenticated && approved;
}
