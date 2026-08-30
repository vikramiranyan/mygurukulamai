export const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export type DriveTokenClient = {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
};

type DriveTokenResponse = {
  access_token?: string;
  scope?: string;
  error?: string | { error?: string; error_description?: string };
  error_description?: string;
};

export function createDriveTokenClient(
  clientId: string,
  callback: (accessToken: string) => void,
  onError?: (error: unknown) => void,
): DriveTokenClient | null {
  const google = (window as any).google;
  if (!google?.accounts?.oauth2?.initTokenClient) return null;

  return google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: GOOGLE_DRIVE_SCOPE,
    callback: (response: DriveTokenResponse) => {
      if (response.access_token) {
        const grantedScopes = response.scope?.split(/\s+/).filter(Boolean) || [];
        if (grantedScopes.length && !grantedScopes.includes(GOOGLE_DRIVE_SCOPE)) {
          onError?.(new Error('Google Drive permission was not granted for this app'));
          return;
        }
        callback(response.access_token);
        return;
      }

      const detail = typeof response.error === 'string'
        ? response.error
        : response.error?.error_description || response.error?.error || response.error_description;
      onError?.(new Error(detail || 'Google Drive authorization failed'));
    },
  });
}

export function requestDriveAccess(client: DriveTokenClient, prompt: 'consent' | '' = 'consent') {
  // IMPORTANT: an empty prompt must be sent explicitly. Omitting the property
  // makes GIS use its default `select_account` behavior, which caused the
  // account chooser to appear again for returning users.
  client.requestAccessToken({ prompt });
}
