import { createDriveTokenClient, requestDriveAccess, type DriveTokenClient } from './googleDriveAuth';
import { loadChildrenFromDrive, removeChildFromDrive, saveChildToDrive, type DriveChildRecord } from './driveChildStore';

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

  configure(
    clientId: string,
    onToken: (token: string) => void,
    onError: (error: unknown) => void,
  ): boolean {
    // A single controller instance is reused by the SPA. Never carry a Drive
    // token or pending operation from one signed-in parent to another.
    this.rejectToken?.(new Error('Google Drive session changed'));
    this.token = '';
    this.waitingForToken = null;
    this.resolveToken = null;
    this.rejectToken = null;

    this.client = createDriveTokenClient(
      clientId,
      (token) => {
        this.token = token;
        this.resolveToken?.(token);
        this.resolveToken = null;
        this.rejectToken = null;
        this.waitingForToken = null;
        onToken(token);
      },
      (error) => {
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
   * Queue the operation behind that callback instead of failing prematurely.
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

  /** Clear transient OAuth state when the parent signs out. */
  reset(): void {
    this.rejectToken?.(new Error('Google Drive session ended'));
    this.token = '';
    this.client = null;
    this.waitingForToken = null;
    this.resolveToken = null;
    this.rejectToken = null;
  }
}
