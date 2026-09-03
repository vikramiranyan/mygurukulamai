export const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export type DrivePrompt = '' | 'consent' | 'none' | 'select_account';
export type DriveTokenClient = { requestAccessToken: (overrideConfig?: { prompt?: DrivePrompt }) => void };
type DriveTokenResponse = { access_token?: string; scope?: string; error?: string | { error?: string; error_description?: string }; error_description?: string };
const SILENT_RECOVERY_ERRORS = new Set(['interaction_required', 'login_required', 'consent_required']);
let driveGrantKnownInMemory = false;

export function createDriveTokenClient(clientId: string, callback: (accessToken: string) => void, onError?: (error: unknown) => void): DriveTokenClient | null {
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
          driveGrantKnownInMemory = false;
          onError?.(new Error('Google Drive permission was not granted for this app'));
          return;
        }
        driveGrantKnownInMemory = true;
        callback(response.access_token);
        return;
      }
      const detail = typeof response.error === 'string' ? response.error : response.error?.error_description || response.error?.error || response.error_description;
      const code = typeof response.error === 'string' ? response.error : response.error?.error;
      const error = new Error(detail || 'Google Drive authorization failed');
      (error as Error & { code?: string }).code = code;
      if (driveGrantKnownInMemory && code && SILENT_RECOVERY_ERRORS.has(code)) {
        driveGrantKnownInMemory = false;
        try {
          const retryClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: GOOGLE_DRIVE_SCOPE,
            include_granted_scopes: true,
            callback: (retry: DriveTokenResponse) => {
              if (retry.access_token) {
                driveGrantKnownInMemory = true;
                callback(retry.access_token);
                return;
              }
              onError?.(error);
            },
          });
          retryClient.requestAccessToken({ prompt: '' });
          return;
        } catch {
          // Fall through to the original error.
        }
      }
      onError?.(error);
    },
  });
}

export function requestDriveAccess(client: DriveTokenClient, prompt?: DrivePrompt) {
  const effectivePrompt: DrivePrompt = prompt === 'consent' || prompt === 'select_account'
    ? prompt
    : (driveGrantKnownInMemory ? 'none' : '');
  client.requestAccessToken({ prompt: effectivePrompt });
}
