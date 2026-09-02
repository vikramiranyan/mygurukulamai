import { createDriveTokenClient, requestDriveAccess, type DriveTokenClient } from './googleDriveAuth';
import { loadChildrenFromDrive, removeChildFromDrive, saveChildToDrive, type DriveChildRecord } from './driveChildStore';
import { loadChildTimetable, saveChildTimetable, updateChildSubjects, type ChildTimetableRecord } from './driveTimetableStore';
import { loadLearningWorkspace, removeLearningWorkspace, saveLearningWorkspace } from './driveLearningWorkspaceStore';
import { DriveApiError, probeDriveAccess, clearDriveFolderCache } from './googleDrive';
import { normalizeWorkspace, type ChildWorkspace } from '../learningWorkspace';

const SESSION_KEY = 'gurukulam-auth-session';
const MIGRATION_PROMPT_PREFIX = 'gurukulam-drive-local-migration-prompted:';

function readJson<T>(key: string, fallback: T): T {
  try { return JSON.parse(sessionStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}
function migrationPromptKey(userId: string): string { return `${MIGRATION_PROMPT_PREFIX}${encodeURIComponent(userId)}`; }
function migrationWasPrompted(userId: string): boolean {
  try { return Boolean(userId && sessionStorage.getItem(migrationPromptKey(userId)) === '1'); } catch { return false; }
}
function markMigrationPrompted(userId: string): void {
  try { if (userId) sessionStorage.setItem(migrationPromptKey(userId), '1'); } catch { /* storage may be unavailable */ }
}
function installNavigationDriveCheck(controller: DriveSyncController): void {
  if (typeof document === 'undefined') return;
  if (document.documentElement.dataset.gurukulamDriveNavigationCheck === 'true') return;
  document.documentElement.dataset.gurukulamDriveNavigationCheck = 'true';
  document.addEventListener('click', event => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest('button');
    if (!button) return;
    const label = button.textContent?.replace(/^[^A-Za-z←]+/, '').trim() || '';
    if (label.includes('Parents Access') || label.includes('Child Dashboard')) void controller.ensureConnection();
  }, true);
}

export class DriveSyncController {
  private client: DriveTokenClient | null = null;
  private token = '';
  private waitingForToken: Promise<string> | null = null;
  private resolveToken: ((token: string) => void) | null = null;
  private rejectToken: ((error: unknown) => void) | null = null;
  private configurationVersion = 0;

  constructor() { installNavigationDriveCheck(this); }

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
      void probeDriveAccess(token).then(async () => {
        if (version !== this.configurationVersion) return;
        this.token = token;
        await this.migrateLocalChildren(onError);
        if (version !== this.configurationVersion) return;
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
    requestDriveAccess(this.client, '');
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
      try { requestDriveAccess(this.client!, ''); } catch (error) { reject(error); }
    });
  }

  private async requireToken(): Promise<string> {
    if (!this.client) throw new Error('Google Drive authorization is not ready');
    // The token was already validated when Google granted it. Avoid a network
    // probe before every Drive operation; retry with a fresh grant only after
    // an actual Drive request reports an authorization failure.
    if (this.token) return this.token;
    if (!this.waitingForToken) this.waitingForToken = this.requestTokenForCurrentGrant().finally(() => { this.waitingForToken = null; });
    return this.waitingForToken;
  }

  async loadChildren(): Promise<DriveChildRecord[]> { return loadChildrenFromDrive(await this.requireToken()); }
  async saveChild(child: DriveChildRecord) { return saveChildToDrive(await this.requireToken(), child); }
  async removeChild(childId: string): Promise<void> { const token = await this.requireToken(); await removeLearningWorkspace(token, childId); await removeChildFromDrive(token, childId); }
  async loadTimetable(childId: string): Promise<ChildTimetableRecord | null> { return loadChildTimetable(await this.requireToken(), childId); }
  async saveTimetable(record: ChildTimetableRecord) { return saveChildTimetable(await this.requireToken(), record); }
  async updateSubjects(childId: string, subjects: string[], auditEntry: ChildTimetableRecord['audit'][number]): Promise<ChildTimetableRecord> { return updateChildSubjects(await this.requireToken(), childId, subjects, auditEntry); }
  async loadWorkspace(childId: string): Promise<ChildWorkspace | null> { const workspace = await loadLearningWorkspace(await this.requireToken(), childId); return workspace ? normalizeWorkspace({ [childId]: workspace })[childId] : null; }

  async saveWorkspace(childId: string, workspace: ChildWorkspace): Promise<void> {
    const token = await this.requireToken();
    const timetable = await loadChildTimetable(token, childId);
    const nextWorkspace = timetable ? { ...workspace, subjects: timetable.subjects } : workspace;
    await saveLearningWorkspace(token, childId, nextWorkspace);
  }

  private async migrateLocalChildren(onError: (error: unknown) => void): Promise<void> {
    const session = readJson<{ user?: { id?: string } }>(SESSION_KEY, {});
    const userId = session.user?.id;
    if (!userId || !this.token || migrationWasPrompted(userId)) return;

    const localKey = `gurukulam:${encodeURIComponent(userId)}:children`;
    let parsed: unknown = [];
    try { parsed = JSON.parse(localStorage.getItem(localKey) || '[]'); }
    catch { onError(new Error('Local child data could not be read; migration was skipped.')); return; }
    if (!Array.isArray(parsed)) { onError(new Error('Local child data has an invalid format; migration was skipped.')); return; }

    const meaningful: DriveChildRecord[] = [];
    const unMigratable: unknown[] = [];
    for (const value of parsed) {
      if (value && typeof value === 'object' && 'id' in value && 'name' in value && typeof value.id === 'string' && value.id.trim() && typeof value.name === 'string' && value.name.trim()) meaningful.push(value as DriveChildRecord);
      else unMigratable.push(value);
    }
    if (!meaningful.length) {
      if (unMigratable.length) localStorage.setItem(localKey, JSON.stringify(unMigratable));
      else { localStorage.removeItem(localKey); localStorage.removeItem(`gurukulam:${encodeURIComponent(userId)}:active-child`); }
      markMigrationPrompted(userId);
      return;
    }

    markMigrationPrompted(userId);
    const confirmed = window.confirm(`Gurukulam AI found ${meaningful.length} existing child record${meaningful.length === 1 ? '' : 's'} on this device.\n\nUpload ${meaningful.length === 1 ? 'it' : 'them'} to your Google Drive so your learning data is available across devices?\n\nChoose Cancel to keep the local draft only.`);
    if (!confirmed) return;

    try {
      const remote = await loadChildrenFromDrive(this.token);
      const remoteIds = new Set(remote.map(child => child.id));
      await Promise.all(meaningful.filter(child => !remoteIds.has(child.id)).map(child => saveChildToDrive(this.token, child)));
      if (unMigratable.length) localStorage.setItem(localKey, JSON.stringify(unMigratable));
      else { localStorage.removeItem(localKey); localStorage.removeItem(`gurukulam:${encodeURIComponent(userId)}:active-child`); }
    } catch (error) { onError(error); }
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
  }
}
