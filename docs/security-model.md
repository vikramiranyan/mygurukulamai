# Gurukulam AI Security Model

## Current client-side safeguards

- Google Identity Services is the only sign-in entry point.
- Google credential claims are checked for subject, email, expiry, audience and issuer before a session is created.
- Sessions are stored in `sessionStorage`, not persistent localStorage.
- Learning data is namespaced by the authenticated Google subject before it is stored in localStorage.
- Unscoped legacy browser data is never automatically migrated into a newly authenticated account.
- Expired sessions are removed and the application returns to the login screen.
- Child profiles, progress and approval records are loaded only from the authenticated account namespace.

## Production security boundary

The browser is not a trusted authorization boundary. Final production release must add server-side verification/authorization before treating Google identity, parent authorization or child isolation as security guarantees for remote data or privileged operations.

Until that server-side boundary exists, localStorage data is treated as browser-local application state rather than a secure datastore. No sensitive server-side authorization decision is delegated to the browser.
