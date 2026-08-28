# Separate Login + Dashboard Implementation Plan

The canonical product UI is a dedicated public login experience followed by an authenticated parent dashboard.

1. Public login is the only unauthenticated entry screen.
2. Google OAuth remains the authentication mechanism.
3. Successful authentication exposes the parent dashboard.
4. Dashboard data is loaded only for the authenticated parent session.
5. Dashboard follows `docs/ui-ux-direction.md`.
6. Mobile-first responsive behaviour and accessible controls are required.
7. Sign-in, refresh, sign-out, direct dashboard navigation and callback behaviour must be validated by automated tests where possible and by live-browser acceptance for the final release gate.
