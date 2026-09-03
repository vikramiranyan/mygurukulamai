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

const DRIVE_GRANT_KEY = 'gurukulam-drive-grant-v1';
const SILENT_RECOVERY_ERRORS = new Set(['interaction_required', 'login_required', 'consent_required']);

function hasStoredGrant(): boolean {
  try { return sessionStorage.getItem(DRIVE_GRANT_KEY) === '1'; } catch { return false; }
}
function markStoredGrant(): void {
  try { sessionStorage.setItem(DRIVE_GRANT_KEY, '1'); } catch { /* storage may be unavailable */ }
}
function clearStoredGrant(): void {
  try { sessionStorage.removeItem(DRIVE_GRANT_KEY); } catch { /* storage may be unavailable */ }
}

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
          clearStoredGrant();
          onError?.(new Error('Google Drive permission was not granted for this app'));
          return;
        }
        markStoredGrant();
        callback(response.access_token);
        return;
      }

      const detail = typeof response.error === 'string'
        ? response.error
        : response.error?.error_description || response.error?.error || response.error_description;
      const code = typeof response.error === 'string' ? response.error : response.error?.error;
      const error = new Error(detail || 'Google Drive authorization failed');
      (error as Error & { code?: string }).code = code;

      // A returning user should not see the Drive consent dialog on every
      // navigation/reload. If Google says the silent grant is no longer usable,
      // clear the cached grant and perform exactly one normal authorization.
      if (hasStoredGrant() && code && SILENT_RECOVERY_ERRORS.has(code)) {
        clearStoredGrant();
        try { google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: GOOGLE_DRIVE_SCOPE,
          include_granted_scopes: true,
          callback: (retry: DriveTokenResponse) => {
            if (retry.access_token) { markStoredGrant(); callback(retry.access_token); return; }
            onError?.(error);
          },
        }).requestAccessToken({ prompt: '' }); return; } catch { /* fall through */ }
      }
      onError?.(error);
    },
  });
}

/** Request a Drive token. Existing grants are renewed silently; first-time users
 * receive the normal Google authorization flow. */
export function requestDriveAccess(client: DriveTokenClient, prompt?: DrivePrompt) {
  client.requestAccessToken({ prompt: prompt ?? (hasStoredGrant() ? 'none' : '') });
}
