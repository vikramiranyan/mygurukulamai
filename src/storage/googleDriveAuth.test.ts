import { describe, expect, it } from 'vitest';
import { GOOGLE_DRIVE_SCOPE } from './googleDriveAuth';

describe('Google Drive OAuth', () => {
  it('requests least-privilege access to app-created Drive files', () => {
    expect(GOOGLE_DRIVE_SCOPE).toBe('https://www.googleapis.com/auth/drive.file');
  });
});
