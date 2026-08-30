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

/**
 * Google Identity Services token requests must be initiated from a real user
 * action when a consent/popup flow is required. Do not start Drive OAuth from
 * a delayed timer after Google Sign-In; browsers can block that popup.
 */
export class DriveSyncController {
  private client: DriveTokenClient | null = null;
  private token = '';
  private waitingForToken: Promise<string> | null = null;
  private resolveToken: ((token: string) => void) | null = null;
  private rejectToken: ((error: unknown) => void) | null = null;
  private configurationVersion = 0;

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

        // Receiving an OAuth token proves authorization only. First prove that
        // the token can actually reach the Drive API; only then expose it as
        // an authorized/connected Drive session to the rest of the app.
        void probeDriveAccess(token)
          .then(() => {
            if (version !== this.configurationVersion) return;
            this.token = token;
            this.resolveToken?.(token);
            this.resolveToken = null;
            this.rejectToken = null;
            this.waitingForToken = null;
            onToken(token);
            void this.migrateLocalChildren(onError);
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

  /** Start Drive authorization from an explicit user action. */
  authorize(): void {
    if (!this.client) {
      throw new Error('Google Drive authorization is not ready');
    }
    requestDriveAccess(this.client, '');
  }

  get authorized(): boolean {
    return Boolean(this.token);
  }

  get configured(): boolean {
    return Boolean(this.client);
  }

  /**
   * Save/load/delete can race the OAuth callback immediately after consent.
   * Queue the operation behind the callback instead of failing prematurely.
   */
  private async requireToken(): Promise<string> {
    if (this.token) return this.token;
    if (!this.client) {
      throw new Error('Google Drive authorization is not ready');
    }

    if (!this.waitingForToken) {
      this.waitingForToken = new Promise<string>((resolve, reject) => {
        this.resolveToken = resolve;
        this.rejectToken = reject;
        try {
          requestDriveAccess(this.client!, '');
        } catch (error) {
          reject(error);
        }
      }).finally(() => {
        this.waitingForToken = null;
      });
    }

    return this.waitingForToken;
  }

  async loadChildren(): Promise<DriveChildRecord[]> {
    const token = await this.requireToken();
    return loadChildrenFromDrive(token);
  }

  async saveChild(child: DriveChildRecord) {
    const token = await this.requireToken();
    return saveChildToDrive(token, child);
  }

  async removeChild(childId: string): Promise<void> {
    const token = await this.requireToken();
    return removeChildFromDrive(token, childId);
  }

  /**
   * Existing child profiles were historically kept only in localStorage. Once
   * Drive access is genuinely working, copy those profiles to the app-owned
   * Drive folder if that folder has no remote child records yet.
   */
  private async migrateLocalChildren(onError: (error: unknown) => void): Promise<void> {
    const session = readJson<{ user?: { id?: string } }>(SESSION_KEY, {});
    const userId = session.user?.id;
    if (!userId || !this.token) return;

    const migrationKey = `gurukulam-drive-local-migration-done:${userId}`;
    if (sessionStorage.getItem(migrationKey) === '1') return;

    const localKey = `gurukulam:${encodeURIComponent(userId)}:children`;
    let localChildren: DriveChildRecord[] = [];
    try {
      localChildren = JSON.parse(localStorage.getItem(localKey) || '[]');
    } catch {
      localChildren = [];
    }

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

      for (const child of meaningful) {
        await saveChildToDrive(this.token, child);
      }
      sessionStorage.setItem(migrationKey, '1');
    } catch (error) {
      onError(error);
    }
  }

  /** Clear transient OAuth state when the parent signs out. */
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
