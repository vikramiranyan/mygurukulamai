export const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export type DrivePrompt = '' | 'consent' | 'none' | 'select_account';

export type DriveTokenClient = {
  requestAccessToken: (overrideConfig?: { prompt?: DrivePrompt }) => void;
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
    include_granted_scopes: true,
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
      const error = new Error(detail || 'Google Drive authorization failed');
      (error as Error & { code?: string }).code = typeof response.error === 'string'
        ? response.error
        : response.error?.error;
      onError?.(error);
    },
  });
}

/**
 * Request a Drive token. Returning users must use a silent/normal token refresh
 * instead of repeatedly forcing the consent dialog. Google documents that an
 * empty prompt skips the account chooser and consent dialog for an existing
 * authorization grant; `none` is used when we explicitly require a silent
 * request with no UI at all.
 */
export function requestDriveAccess(client: DriveTokenClient, prompt: DrivePrompt = '') {
  client.requestAccessToken({ prompt });
}
