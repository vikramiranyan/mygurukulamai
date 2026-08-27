# Separate Login + Dashboard Implementation Plan

1. Create a public login route as the only unauthenticated entry screen.
2. Keep the existing Google OAuth client integration and authenticate before dashboard access.
3. Redirect successful authentication to `/dashboard` (or the configured SPA dashboard route).
4. Render parent dashboard data only after authenticated state is established.
5. Build the dashboard using the approved Gurukulam visual direction: rich imagery, child selector, progress summaries, continue learning, teacher card, subject grid, recent activity and streak.
6. Keep mobile-first responsive behavior and accessible controls.
7. Validate sign-in, refresh, sign-out, direct dashboard navigation and callback behavior in CI and on the live site.
