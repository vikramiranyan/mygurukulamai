import { createDriveTokenClient, requestDriveAccess, type DrivePrompt, type DriveTokenClient } from './googleDriveAuth';
import { loadChildrenFromDrive, removeChildFromDrive, saveChildToDrive, type DriveChildRecord } from './driveChildStore';
import { loadChildTimetable, saveChildTimetable, updateChildSubjects, type ChildTimetableRecord } from './driveTimetableStore';
import { deleteWorkspaceSubject, loadLearningWorkspace, removeLearningWorkspace, renameWorkspaceSubject, saveLearningWorkspace } from './driveLearningWorkspaceStore';
import { DriveApiError, probeDriveAccess, clearDriveFolderCache, deleteChapterAssets, ensureGurukulamFolders, uploadBinary, downloadBinary, findNamedChildFile, writeJson, ensureFolder } from './googleDrive';
import { normalizeWorkspace, type ChapterRecord, type ChildWorkspace } from '../learningWorkspace';

let activeDriveSync: DriveSyncController | null = null;
export function getActiveDriveSync(): DriveSyncController | null { return activeDriveSync; }

export class DriveSyncController {
  private client: DriveTokenClient | null = null;
  private token = '';
  private waitingForToken: Promise<string> | null = null;
  private resolveToken: ((token: string) => void) | null = null;
  private rejectToken: ((error: unknown) => void) | null = null;
  private configurationVersion = 0;
  private reconnecting = false;

  constructor() { activeDriveSync = this; }

  configure(clientId: string, onToken: (token: string) => void, onError: (error: unknown) => void): boolean {
    this.rejectToken?.(new Error('Google Drive session changed'));
    this.configurationVersion += 1;
    const version = this.configurationVersion;
    this.token = '';
    this.waitingForToken = null;
    this.resolveToken = null;
    this.rejectToken = null;
    this.client = createDriveTokenClient(clientId, token => {
      if (version !== this.configurationVersion) return;
      void probeDriveAccess(token).then(() => {
        if (version !== this.configurationVersion) return;
        this.token = token;
        this.resolveToken?.(token);
        this.resolveToken = null;
        this.rejectToken = null;
        this.waitingForToken = null;
        onToken(token);
      }).catch(error => {
        if (version !== this.configurationVersion) return;
        this.token = '';
        this.resolveToken = null;
        this.rejectToken?.(error);
        this.rejectToken = null;
        this.waitingForToken = null;
        onError(error);
      });
    }, error => {
      if (version !== this.configurationVersion) return;
      this.token = '';
      this.resolveToken = null;
      this.rejectToken?.(error);
      this.rejectToken = null;
      this.waitingForToken = null;
      onError(error);
    });
    return Boolean(this.client);
  }

  authorize(prompt?: DrivePrompt): void {
    if (!this.client) throw new Error('Google Drive authorization is not ready');
    requestDriveAccess(this.client, prompt);
  }

  async ensureConnection(): Promise<boolean> {
    try { await this.requireToken(); return true; } catch { return false; }
  }

  get authorized(): boolean { return Boolean(this.token); }
  get configured(): boolean { return Boolean(this.client); }

  private async requestTokenForCurrentGrant(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.resolveToken = resolve;
      this.rejectToken = reject;
      try { requestDriveAccess(this.client!); } catch (error) { reject(error); }
    });
  }

  private async reconnectAfterDriveAuthFailure(error: unknown): Promise<string> {
    if (this.reconnecting) throw error;
    this.reconnecting = true;
    this.token = '';
    try { return await this.requestTokenForCurrentGrant(); }
    finally { this.reconnecting = false; }
  }

  private async requireToken(): Promise<string> {
    if (!this.client) throw new Error('Google Drive authorization is not ready');
    if (this.token) return this.token;
    if (!this.waitingForToken) this.waitingForToken = this.requestTokenForCurrentGrant().finally(() => { this.waitingForToken = null; });
    return this.waitingForToken;
  }

  private async withDriveRetry<T>(operation: (token: string) => Promise<T>): Promise<T> {
    const token = await this.requireToken();
    try { return await operation(token); }
    catch (error) {
      if (!(error instanceof DriveApiError) || error.status !== 401) throw error;
      clearDriveFolderCache(token);
      const freshToken = await this.reconnectAfterDriveAuthFailure(error);
      return operation(freshToken);
    }
  }

  async loadChildren(): Promise<DriveChildRecord[]> { return this.withDriveRetry(loadChildrenFromDrive); }
  async saveChild(child: DriveChildRecord) { return this.withDriveRetry(token => saveChildToDrive(token, child)); }
  async removeChild(childId: string): Promise<void> { await this.withDriveRetry(async token => { await removeLearningWorkspace(token, childId); await removeChildFromDrive(token, childId); }); }
  async loadTimetable(childId: string, scopeId = childId): Promise<ChildTimetableRecord | null> { return this.withDriveRetry(token => loadChildTimetable(token, childId, scopeId)); }
  async saveTimetable(record: ChildTimetableRecord) { return this.withDriveRetry(token => saveChildTimetable(token, record)); }
  async updateSubjects(childId: string, subjects: string[], auditEntry: ChildTimetableRecord['audit'][number]): Promise<ChildTimetableRecord> { return this.withDriveRetry(token => updateChildSubjects(token, childId, subjects, auditEntry)); }
  async loadWorkspace(childId: string, scopeId = childId): Promise<ChildWorkspace | null> { return this.withDriveRetry(async token => { const workspace = await loadLearningWorkspace(token, scopeId) || (scopeId === childId ? null : await loadLearningWorkspace(token, childId)); return workspace ? normalizeWorkspace({ [childId]: workspace })[childId] : null; }); }
  async saveWorkspace(childId: string, workspace: ChildWorkspace, scopeId = childId): Promise<void> { await this.withDriveRetry(async token => { const timetable = await loadChildTimetable(token, childId, scopeId); const nextWorkspace = timetable ? { ...workspace, subjects: timetable.subjects } : workspace; await saveLearningWorkspace(token, scopeId, nextWorkspace); }); }
  async uploadChapterFile(file: File, childId: string, subject: string, chapterTitle: string): Promise<{ id: string; webViewLink?: string; folderId: string; folderUrl?: string }> {
    return this.withDriveRetry(async token => {
      const { childrenId } = await ensureGurukulamFolders(token);
      const childFolder = await ensureFolder(token, childId, childrenId);
      const subjectFolder = await ensureFolder(token, subject, childFolder.id);
      const chapterFolder = await ensureFolder(token, chapterTitle, subjectFolder.id);
      const uploaded = await uploadBinary(token, chapterFolder.id, file.name, file.type || 'application/octet-stream', file);
      return { id: uploaded.id, webViewLink: uploaded.webViewLink, folderId: chapterFolder.id, folderUrl: chapterFolder.webViewLink };
    });
  }
  async uploadChapterPage(folderId: string, pageNumber: number, image: Blob): Promise<{ id: string; webViewLink?: string }> {
    return this.withDriveRetry(token => uploadBinary(token, folderId, `page-${pageNumber}.png`, 'image/png', image));
  }
  async uploadChapterPages(folderId: string, pages: Array<{ pageNumber: number; image: Blob }>): Promise<Array<{ pageNumber: number; image: Blob }>> {
    const uploaded = await Promise.all(pages.map(async page => ({
      pageNumber: page.pageNumber,
      file: await this.uploadChapterPage(folderId, page.pageNumber, page.image),
    })));
    return Promise.all(uploaded.map(async page => ({
      pageNumber: page.pageNumber,
      image: await this.downloadChapterFile(page.file.id),
    })));
  }
  async downloadChapterFile(fileId: string): Promise<Blob> {
    return this.withDriveRetry(token => downloadBinary(token, fileId));
  }
  async saveChapterText(childId: string, chapterId: string, data: unknown): Promise<void> {
    await this.withDriveRetry(async token => {
      const { childrenId } = await ensureGurukulamFolders(token);
      const fileName = `${childId}-${chapterId}-chapter-pages.json`;
      const existing = await findNamedChildFile(token, childrenId, fileName);
      await writeJson(token, childrenId, fileName, data, existing?.id);
    });
  }
  async deleteChapter(childId: string, chapter: ChapterRecord): Promise<void> {
    await this.withDriveRetry(token => deleteChapterAssets(token, childId, chapter.id, chapter.sourceFileId, chapter.driveFolderId));
  }
  async renameSubject(childId: string, previousSubject: string, nextSubject: string): Promise<void> { await this.withDriveRetry(token => renameWorkspaceSubject(token, childId, previousSubject, nextSubject)); }
  async deleteSubject(childId: string, subject: string): Promise<void> { await this.withDriveRetry(token => deleteWorkspaceSubject(token, childId, subject)); }

  reset(): void {
    clearDriveFolderCache(this.token || undefined);
    this.rejectToken?.(new Error('Google Drive session ended'));
    this.configurationVersion += 1;
    this.token = '';
    this.client = null;
    this.waitingForToken = null;
    this.resolveToken = null;
    this.rejectToken = null;
    this.reconnecting = false;
    if (activeDriveSync === this) activeDriveSync = null;
  }
}
