import { createDriveTokenClient, requestDriveAccess, type DriveTokenClient } from './googleDriveAuth';
import { loadChildrenFromDrive, removeChildFromDrive, saveChildToDrive, type DriveChildRecord } from './driveChildStore';
import { loadChildTimetable, saveChildTimetable, updateChildSubjects, type ChildTimetableRecord } from './driveTimetableStore';
import { loadLearningWorkspace, removeLearningWorkspace, saveLearningWorkspace } from './driveLearningWorkspaceStore';
import { DriveApiError, probeDriveAccess, clearDriveFolderCache } from './googleDrive';
import { normalizeWorkspace, type ChildWorkspace } from '../learningWorkspace';

export class DriveSyncController {
  private client: DriveTokenClient | null = null;
  private token = '';
  private waitingForToken: Promise<string> | null = null;
  private resolveToken: ((token: string) => void) | null = null;
  private rejectToken: ((error: unknown) => void) | null = null;
  private configurationVersion = 0;
  private reconnecting = false;

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

  authorize(): void {
    if (!this.client) throw new Error('Google Drive authorization is not ready');
    requestDriveAccess(this.client);
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

  async loadChildren(): Promise<DriveChildRecord[]> {
    return this.withDriveRetry(loadChildrenFromDrive);
  }

  async saveChild(child: DriveChildRecord) {
    return this.withDriveRetry(token => saveChildToDrive(token, child));
  }

  async removeChild(childId: string): Promise<void> {
    await this.withDriveRetry(async token => {
      await removeLearningWorkspace(token, childId);
      await removeChildFromDrive(token, childId);
    });
  }

  async loadTimetable(childId: string): Promise<ChildTimetableRecord | null> {
    return this.withDriveRetry(token => loadChildTimetable(token, childId));
  }

  async saveTimetable(record: ChildTimetableRecord) {
    return this.withDriveRetry(token => saveChildTimetable(token, record));
  }

  async updateSubjects(childId: string, subjects: string[], auditEntry: ChildTimetableRecord['audit'][number]): Promise<ChildTimetableRecord> {
    return this.withDriveRetry(token => updateChildSubjects(token, childId, subjects, auditEntry));
  }

  async loadWorkspace(childId: string): Promise<ChildWorkspace | null> {
    return this.withDriveRetry(async token => {
      const workspace = await loadLearningWorkspace(token, childId);
      return workspace ? normalizeWorkspace({ [childId]: workspace })[childId] : null;
    });
  }

  async saveWorkspace(childId: string, workspace: ChildWorkspace): Promise<void> {
    await this.withDriveRetry(async token => {
      const timetable = await loadChildTimetable(token, childId);
      const nextWorkspace = timetable ? { ...workspace, subjects: timetable.subjects } : workspace;
      await saveLearningWorkspace(token, childId, nextWorkspace);
    });
  }

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
  }
}
