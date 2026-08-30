import { createDriveTokenClient, requestDriveAccess, type DriveTokenClient } from './googleDriveAuth';
import { loadChildrenFromDrive, removeChildFromDrive, saveChildToDrive, type DriveChildRecord } from './driveChildStore';
import { probeDriveAccess } from './googleDrive';

const SESSION_KEY = 'gurukulam-auth-session';

function readJson<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(sessionStorage.getItem(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}

function installNavigationDriveCheck(controller: DriveSyncController): void {
  if (typeof document === 'undefined') return;
  if (document.documentElement.dataset.gurukulamDriveNavigationCheck === 'true') return;
  document.documentElement.dataset.gurukulamDriveNavigationCheck = 'true';

  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest('button');
    if (!button) return;
    const label = button.textContent?.replace(/^[^A-Za-z←]+/, '').trim() || '';
    if (label.includes('Parents Access') || label.includes('Child Dashboard')) {
      // Do not block navigation. Re-check/re-establish Drive immediately in the
      // background. If an existing grant is still valid this is a silent probe;
      // if the token is stale/revoked, GIS is asked to restore the connection.
      void controller.ensureConnection();
    }
  }, true);
}

export class DriveSyncController {
  private client: DriveTokenClient | null = null;
  private token = '';
  private waitingForToken: Promise<string> | null = null;
  private resolveToken: ((token: string) => void) | null = null;
  private rejectToken: ((error: unknown) => void) | null = null;
  private configurationVersion = 0;

  constructor() {
    installNavigationDriveCheck(this);
  }

  configure(
    clientId: string,
    onToken: (token: string) => void,
    onError: (error: unknown) => void,
  ): boolean {
    this.rejectToken?.(new Error('Google Drive session changed'));
    this.configurationVersion += 1;
    const version = this.configurationVersion;
    this.token = '';
    this.waitingForToken = null;
    this.resolveToken = null;
    this.rejectToken = null;

    this.client = createDriveTokenClient(
      clientId,
      (token) => {
        if (version !== this.configurationVersion) return;
        void probeDriveAccess(token)
          .then(async () => {
            if (version !== this.configurationVersion) return;
            this.token = token;
            this.resolveToken?.(token);
            this.resolveToken = null;
            this.rejectToken = null;
            this.waitingForToken = null;
            await this.migrateLocalChildren(onError);
            if (version === this.configurationVersion) onToken(token);
          })
          .catch((error) => {
            if (version !== this.configurationVersion) return;
            this.resolveToken = null;
            this.rejectToken?.(error);
            this.rejectToken = null;
            this.waitingForToken = null;
            onError(error);
          });
      },
      (error) => {
        if (version !== this.configurationVersion) return;
        this.resolveToken = null;
        this.rejectToken?.(error);
        this.rejectToken = null;
        this.waitingForToken = null;
        onError(error);
      },
    );

    return Boolean(this.client);
  }

  authorize(): void {
    if (!this.client) throw new Error('Google Drive authorization is not ready');
    requestDriveAccess(this.client, '');
  }

  /** Re-check Drive before protected navigation and re-establish it when needed. */
  async ensureConnection(): Promise<boolean> {
    try {
      await this.requireToken();
      return true;
    } catch {
      return false;
    }
  }

  get authorized(): boolean { return Boolean(this.token); }
  get configured(): boolean { return Boolean(this.client); }

  private async requireToken(): Promise<string> {
    if (!this.client) throw new Error('Google Drive authorization is not ready');

    if (this.token) {
      try {
        await probeDriveAccess(this.token);
        return this.token;
      } catch {
        this.token = '';
      }
    }

    if (!this.waitingForToken) {
      this.waitingForToken = new Promise<string>((resolve, reject) => {
        this.resolveToken = resolve;
        this.rejectToken = reject;
        try { requestDriveAccess(this.client!, ''); } catch (error) { reject(error); }
      }).finally(() => { this.waitingForToken = null; });
    }
    return this.waitingForToken;
  }

  async loadChildren(): Promise<DriveChildRecord[]> {
    return loadChildrenFromDrive(await this.requireToken());
  }

  async saveChild(child: DriveChildRecord) {
    return saveChildToDrive(await this.requireToken(), child);
  }

  async removeChild(childId: string): Promise<void> {
    return removeChildFromDrive(await this.requireToken(), childId);
  }

  private async migrateLocalChildren(onError: (error: unknown) => void): Promise<void> {
    const session = readJson<{ user?: { id?: string } }>(SESSION_KEY, {});
    const userId = session.user?.id;
    if (!userId || !this.token) return;

    const migrationKey = `gurukulam-drive-local-migration-done:${userId}`;
    const localKey = `gurukulam:${encodeURIComponent(userId)}:children`;
    let localChildren: DriveChildRecord[] = [];
    try { localChildren = JSON.parse(localStorage.getItem(localKey) || '[]'); } catch { localChildren = []; }

    const meaningful = localChildren.filter(child => child?.id && child.name?.trim());
    try {
      const remote = await loadChildrenFromDrive(this.token);
      if (!remote.length && meaningful.length) {
        for (const child of meaningful) await saveChildToDrive(this.token, child);
      }
      localStorage.removeItem(localKey);
      localStorage.removeItem(`gurukulam:${encodeURIComponent(userId)}:active-child`);
      sessionStorage.setItem(migrationKey, '1');
    } catch (error) {
      onError(error);
    }
  }

  reset(): void {
    this.rejectToken?.(new Error('Google Drive session ended'));
    this.configurationVersion += 1;
    this.token = '';
    this.client = null;
    this.waitingForToken = null;
    this.resolveToken = null;
    this.rejectToken = null;
  }
}
