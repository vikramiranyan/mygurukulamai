import { createDriveTokenClient, requestDriveAccess, type DriveTokenClient } from './googleDriveAuth';
import { loadChildrenFromDrive, removeChildFromDrive, saveChildToDrive, type DriveChildRecord } from './driveChildStore';
import { loadChildTimetable, saveChildTimetable, updateChildSubjects, type ChildTimetableRecord } from './driveTimetableStore';
import { loadLearningWorkspace, removeLearningWorkspace, saveLearningWorkspace } from './driveLearningWorkspaceStore';
import { DriveApiError, probeDriveAccess } from './googleDrive';
import { normalizeWorkspace, type ChildWorkspace } from '../learningWorkspace';

const SESSION_KEY = 'gurukulam-auth-session';
function readJson<T>(key: string, fallback: T): T { try { return JSON.parse(sessionStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } }
function installNavigationDriveCheck(controller: DriveSyncController): void {
  if (typeof document === 'undefined') return;
  if (document.documentElement.dataset.gurukulamDriveNavigationCheck === 'true') return;
  document.documentElement.dataset.gurukulamDriveNavigationCheck = 'true';
  document.addEventListener('click', event => { const target = event.target as HTMLElement | null; const button = target?.closest('button'); if (!button) return; const label = button.textContent?.replace(/^[^A-Za-z←]+/, '').trim() || ''; if (label.includes('Parents Access') || label.includes('Child Dashboard')) void controller.ensureConnection(); }, true);
}

export class DriveSyncController {
  private client: DriveTokenClient | null = null; private token = ''; private waitingForToken: Promise<string> | null = null; private resolveToken: ((token: string) => void) | null = null; private rejectToken: ((error: unknown) => void) | null = null; private configurationVersion = 0;
  constructor() { installNavigationDriveCheck(this); }
  configure(clientId: string, onToken: (token: string) => void, onError: (error: unknown) => void): boolean {
    this.rejectToken?.(new Error('Google Drive session changed')); this.configurationVersion += 1; const version = this.configurationVersion; this.token = ''; this.waitingForToken = null; this.resolveToken = null; this.rejectToken = null;
    this.client = createDriveTokenClient(clientId, token => { if (version !== this.configurationVersion) return; void probeDriveAccess(token).then(async () => { if (version !== this.configurationVersion) return; this.token = token; await this.migrateLocalChildren(onError); if (version !== this.configurationVersion) return; this.resolveToken?.(token); this.resolveToken = null; this.rejectToken = null; this.waitingForToken = null; onToken(token); }).catch(error => { if (version !== this.configurationVersion) return; this.token = ''; this.resolveToken = null; this.rejectToken?.(error); this.rejectToken = null; this.waitingForToken = null; onError(error); }); }, error => { if (version !== this.configurationVersion) return; this.token = ''; this.resolveToken = null; this.rejectToken?.(error); this.rejectToken = null; this.waitingForToken = null; onError(error); });
    return Boolean(this.client);
  }
  authorize(): void { if (!this.client) throw new Error('Google Drive authorization is not ready'); requestDriveAccess(this.client, ''); }
  async ensureConnection(): Promise<boolean> { try { await this.requireToken(); return true; } catch { return false; } }
  get authorized(): boolean { return Boolean(this.token); }
  get configured(): boolean { return Boolean(this.client); }
  private async requireToken(): Promise<string> {
    if (!this.client) throw new Error('Google Drive authorization is not ready');
    if (this.token) { try { await probeDriveAccess(this.token); return this.token; } catch (error) { if (error instanceof DriveApiError && (error.status === 401 || error.status === 403)) this.token = ''; else throw error; } }
    if (!this.waitingForToken) this.waitingForToken = new Promise<string>((resolve, reject) => { this.resolveToken = resolve; this.rejectToken = reject; try { requestDriveAccess(this.client!, ''); } catch (error) { reject(error); } }).finally(() => { this.waitingForToken = null; });
    return this.waitingForToken;
  }
  async loadChildren(): Promise<DriveChildRecord[]> { return loadChildrenFromDrive(await this.requireToken()); }
  async saveChild(child: DriveChildRecord) { return saveChildToDrive(await this.requireToken(), child); }
  async removeChild(childId: string): Promise<void> { const token = await this.requireToken(); await removeLearningWorkspace(token, childId); await removeChildFromDrive(token, childId); }
  async loadTimetable(childId: string): Promise<ChildTimetableRecord | null> { return loadChildTimetable(await this.requireToken(), childId); }
  async saveTimetable(record: ChildTimetableRecord) { return saveChildTimetable(await this.requireToken(), record); }
  async updateSubjects(childId: string, subjects: string[], auditEntry: ChildTimetableRecord['audit'][number]): Promise<ChildTimetableRecord> { return updateChildSubjects(await this.requireToken(), childId, subjects, auditEntry); }
  async loadWorkspace(childId: string): Promise<ChildWorkspace | null> { const workspace = await loadLearningWorkspace(await this.requireToken(), childId); return workspace ? normalizeWorkspace({ [childId]: workspace })[childId] : null; }
  async saveWorkspace(childId: string, workspace: ChildWorkspace): Promise<void> { await saveLearningWorkspace(await this.requireToken(), childId, workspace); }
  private async migrateLocalChildren(onError: (error: unknown) => void): Promise<void> {
    const session = readJson<{ user?: { id?: string } }>(SESSION_KEY, {}); const userId = session.user?.id; if (!userId || !this.token) return;
    const localKey = `gurukulam:${encodeURIComponent(userId)}:children`; let parsed: unknown = [];
    try { parsed = JSON.parse(localStorage.getItem(localKey) || '[]'); } catch { onError(new Error('Local child data could not be read; migration was skipped.')); return; }
    if (!Array.isArray(parsed)) { onError(new Error('Local child data has an invalid format; migration was skipped.')); return; }
    const meaningful: DriveChildRecord[] = []; const unMigratable: unknown[] = [];
    for (const value of parsed) { if (value && typeof value === 'object' && 'id' in value && 'name' in value && typeof value.id === 'string' && value.id.trim() && typeof value.name === 'string' && value.name.trim()) meaningful.push(value as DriveChildRecord); else unMigratable.push(value); }
    if (!meaningful.length) { if (unMigratable.length) localStorage.setItem(localKey, JSON.stringify(unMigratable)); else { localStorage.removeItem(localKey); localStorage.removeItem(`gurukulam:${encodeURIComponent(userId)}:active-child`); } return; }

    const confirmed = window.confirm(
      `Gurukulam AI found ${meaningful.length} existing child record${meaningful.length === 1 ? '' : 's'} on this device.\n\nUpload ${meaningful.length === 1 ? 'it' : 'them'} to your Google Drive so your learning data is available across devices?\n\nChoose Cancel to keep the local draft only.`,
    );
    if (!confirmed) return;

    try { const remote = await loadChildrenFromDrive(this.token); const remoteIds = new Set(remote.map(child => child.id)); for (const child of meaningful) if (!remoteIds.has(child.id)) { await saveChildToDrive(this.token, child); remoteIds.add(child.id); } if (unMigratable.length) localStorage.setItem(localKey, JSON.stringify(unMigratable)); else { localStorage.removeItem(localKey); localStorage.removeItem(`gurukulam:${encodeURIComponent(userId)}:active-child`); } sessionStorage.setItem(`gurukulam-drive-local-migration-done:${userId}`, '1'); } catch (error) { onError(error); }
  }
  reset(): void { this.rejectToken?.(new Error('Google Drive session ended')); this.configurationVersion += 1; this.token = ''; this.client = null; this.waitingForToken = null; this.resolveToken = null; this.rejectToken = null; }
}
