import { describe, expect, it } from 'vitest';
import { GOOGLE_DRIVE_SCOPE } from './googleDriveAuth';

describe('Google Drive OAuth', () => {
  it('requests full Drive access so existing Gurukulam records remain accessible', () => {
    expect(GOOGLE_DRIVE_SCOPE).toBe('https://www.googleapis.com/auth/drive');
  });
});
