import { createDriveTokenClient, requestDriveAccess, type DriveTokenClient } from './googleDriveAuth';
import { loadChildrenFromDrive, removeChildFromDrive, saveChildToDrive, type DriveChildRecord } from './driveChildStore';

const AUTO_AUTH_ATTEMPT_KEY = 'gurukulam-drive-auto-auth-attempted';
const MIGRATION_DONE_KEY = 'gurukulam-drive-local-migration-done';
const SESSION_KEY = 'gurukulam-auth-session';

function readJson<T>(key: string, fallback: T): T {
  try { return JSON.parse(sessionStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}

function hideManualDriveControl() {
  if (typeof document === 'undefined') return;
  const hide = () => {
    document.querySelectorAll('button').forEach(button => {
      const text = button.textContent?.trim() || '';
      if (text.includes('Connect Google Drive')) {
        const parent = button.closest('.top-actions') || button;
        (parent as HTMLElement).style.display = 'none';
      }
    });
  };
  hide();
  const observer = new MutationObserver(hide);
  observer.observe(document.body, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 10000);
}

export class DriveSyncController {
  private client: DriveTokenClient | null = null;
  private token = '';

  configure(clientId: string, onToken: (token: string) => void, onError: (error: unknown) => void) {
    this.client = createDriveTokenClient(clientId, token => {
      this.token = token;
      onToken(token);
      void this.migrateLocalChildren(onError);
    }, onError);
    if (!this.client) return false;

    // Drive authorization is now part of the signed-in parent onboarding flow.
    // Use prompt:'' so an already-approved user can receive a token without a
    // repeated consent screen; Google still shows consent when required.
    hideManualDriveControl();
    if (sessionStorage.getItem(AUTO_AUTH_ATTEMPT_KEY) !== '1') {
      sessionStorage.setItem(AUTO_AUTH_ATTEMPT_KEY, '1');
      window.setTimeout(() => {
        try { if (this.client) requestDriveAccess(this.client, ''); }
        catch (error) { onError(error); }
      }, 50);
    }
    return true;
  }

  authorize() {
    if (!this.client) throw new Error('Google Drive authorization is not ready');
    requestDriveAccess(this.client, '');
  }

  get authorized() { return Boolean(this.token); }

  async loadChildren() {
    if (!this.token) throw new Error('Google Drive access is required');
    return loadChildrenFromDrive(this.token);
  }

  async saveChild(child: DriveChildRecord) {
    if (!this.token) throw new Error('Google Drive access is required');
    return saveChildToDrive(this.token, child);
  }

  async removeChild(childId: string) {
    if (!this.token) throw new Error('Google Drive access is required');
    return removeChildFromDrive(this.token, childId);
  }

  private async migrateLocalChildren(onError: (error: unknown) => void) {
    if (sessionStorage.getItem(MIGRATION_DONE_KEY) === '1') return;
    const session = readJson<{ user?: { id?: string } }>(SESSION_KEY, {});
    const userId = session.user?.id;
    if (!userId || !this.token) return;

    const localKey = `gurukulam:${encodeURIComponent(userId)}:children`;
    let localChildren: DriveChildRecord[] = [];
    try { localChildren = JSON.parse(localStorage.getItem(localKey) || '[]'); } catch { localChildren = []; }
    const meaningful = localChildren.filter(child => child?.id && child.name?.trim());
    if (!meaningful.length) {
      sessionStorage.setItem(MIGRATION_DONE_KEY, '1');
      return;
    }

    try {
      const remote = await loadChildrenFromDrive(this.token);
      if (remote.length) {
        sessionStorage.setItem(MIGRATION_DONE_KEY, '1');
        return;
      }
      const approved = window.confirm(
        `Gurukulam AI found ${meaningful.length} existing child profile${meaningful.length === 1 ? '' : 's'} on this device. Save ${meaningful.length === 1 ? 'it' : 'them'} securely to your Google Drive?`
      );
      if (!approved) return;
      for (const child of meaningful) await saveChildToDrive(this.token, child);
      sessionStorage.setItem(MIGRATION_DONE_KEY, '1');
    } catch (error) {
      onError(error);
    }
  }
}
