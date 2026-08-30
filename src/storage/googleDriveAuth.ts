export const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export type DriveTokenClient = {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
};

export function createDriveTokenClient(
  clientId: string,
  callback: (accessToken: string) => void,
  onError?: (error: unknown) => void
): DriveTokenClient | null {
  const google = (window as any).google;
  if (!google?.accounts?.oauth2?.initTokenClient) return null;
  return google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: GOOGLE_DRIVE_SCOPE,
    callback: (response: { access_token?: string; error?: unknown }) => {
      if (response.access_token) callback(response.access_token);
      else onError?.(response.error || new Error('Google Drive authorization failed'));
    }
  });
}

export function requestDriveAccess(client: DriveTokenClient, prompt: 'consent' | '' = 'consent') {
  client.requestAccessToken(prompt ? { prompt } : {});
}
