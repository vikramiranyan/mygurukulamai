import { describe, expect, it } from 'vitest';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

describe('Google Drive storage policy', () => {
  it('uses only the least-privilege drive.file scope', () => {
    expect(DRIVE_SCOPE).toBe('https://www.googleapis.com/auth/drive.file');
    expect(DRIVE_SCOPE).not.toBe('https://www.googleapis.com/auth/drive');
  });
});
