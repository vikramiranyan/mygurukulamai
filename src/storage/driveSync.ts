import { createDriveTokenClient, requestDriveAccess, type DriveTokenClient } from './googleDriveAuth';
import { loadChildrenFromDrive, removeChildFromDrive, saveChildToDrive, type DriveChildRecord } from './driveChildStore';

export class DriveSyncController {
  private client: DriveTokenClient | null = null;
  private token = '';

  configure(clientId: string, onToken: (token: string) => void, onError: (error: unknown) => void) {
    this.client = createDriveTokenClient(clientId, token => {
      this.token = token;
      onToken(token);
    }, onError);
    return Boolean(this.client);
  }

  authorize() {
    if (!this.client) throw new Error('Google Drive authorization is not ready');
    requestDriveAccess(this.client, 'consent');
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
}
