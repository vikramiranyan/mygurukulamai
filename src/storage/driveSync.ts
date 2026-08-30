import { createDriveTokenClient, requestDriveAccess, type DriveTokenClient } from './googleDriveAuth';
import { loadChildrenFromDrive, removeChildFromDrive, saveChildToDrive, type DriveChildRecord } from './driveChildStore';

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
  private waitingForToken: Promise<string> | null = null;
  private resolveToken: ((token: string) => void) | null = null;
  private rejectToken: ((error: unknown) => void) | null = null;

  configure(clientId: string, onToken: (token: string) => void, onError: (error: unknown) => void) {
    this.client = createDriveTokenClient(clientId, token => {
      this.token = token;
      this.resolveToken?.(token);
      this.resolveToken = null;
      this.rejectToken = null;
      this.waitingForToken = null;
      onToken(token);
      void this.migrateLocalChildren(onError);
    }, error => {
      this.rejectToken?.(error);
      this.resolveToken = null;
      this.rejectToken = null;
      this.waitingForToken = null;
      onError(error);
    });
    if (!this.client) return false;

    const session = readJson<{ user?: { id?: string } }>(SESSION_KEY, {});
    const userId = session.user?.id || 'unknown';

    // Drive authorization is part of signed-in parent onboarding. If consent
    // was already granted, prompt:'' lets Google return a token without another
    // consent screen. If fresh consent is required, Google may show its OAuth
    // dialog; the browser must be allowed to open that dialog.
    hideManualDriveControl();
    const autoAuthKey = `gurukulam-drive-auto-auth-attempted:${userId}`;
    if (sessionStorage.getItem(autoAuthKey) !== '1') {
      sessionStorage.setItem(autoAuthKey, '1');
      window.setTimeout(() => {
        try { if (this.client && !this.token) requestDriveAccess(this.client, ''); }
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

  private async requireToken(): Promise<string> {
    if (this.token) return this.token;
    if (!this.client) throw new Error('Google Drive authorization is not ready');
    if (!this.waitingForToken) {
      this.waitingForToken = new Promise<string>((resolve, reject) => {
        this.resolveToken = resolve;
        this.rejectToken = reject;
        try { requestDriveAccess(this.client!, ''); }
        catch (error) { reject(error); }
      }).finally(() => { this.waitingForToken = null; });
    }
    return this.waitingForToken;
  }

  async loadChildren() {
    const token = await this.requireToken();
    return loadChildrenFromDrive(token);
  }

  async saveChild(child: DriveChildRecord) {
    const token = await this.requireToken();
    const result = await saveChildToDrive(token, child);
    return result;
  }

  async removeChild(childId: string) {
    const token = await this.requireToken();
    return removeChildFromDrive(token, childId);
  }

  private async migrateLocalChildren(onError: (error: unknown) => void) {
    const session = readJson<{ user?: { id?: string } }>(SESSION_KEY, {});
    const userId = session.user?.id;
    if (!userId || !this.token) return;
    const migrationKey = `gurukulam-drive-local-migration-done:${userId}`;
    if (sessionStorage.getItem(migrationKey) === '1') return;

    const localKey = `gurukulam:${encodeURIComponent(userId)}:children`;
    let localChildren: DriveChildRecord[] = [];
    try { localChildren = JSON.parse(localStorage.getItem(localKey) || '[]'); } catch { localChildren = []; }
    const meaningful = localChildren.filter(child => child?.id && child.name?.trim());
    if (!meaningful.length) {
      sessionStorage.setItem(migrationKey, '1');
      return;
    }

    try {
      const remote = await loadChildrenFromDrive(this.token);
      if (remote.length) {
        sessionStorage.setItem(migrationKey, '1');
        return;
      }
      const approved = window.confirm(
        `Gurukulam AI found ${meaningful.length} existing child profile${meaningful.length === 1 ? '' : 's'} on this device. Save ${meaningful.length === 1 ? 'it' : 'them'} securely to your Google Drive?`
      );
      if (!approved) return;
      for (const child of meaningful) await saveChildToDrive(this.token, child);
      sessionStorage.setItem(migrationKey, '1');
    } catch (error) {
      onError(error);
    }
  }
}
