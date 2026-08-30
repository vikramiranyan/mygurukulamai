import { describe, expect, it } from 'vitest';
import { GOOGLE_DRIVE_SCOPE } from './googleDriveAuth';

describe('Google Drive OAuth', () => {
  it('requests only drive.file', () => {
    expect(GOOGLE_DRIVE_SCOPE).toBe('https://www.googleapis.com/auth/drive.file');
  });
});
