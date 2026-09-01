# Gurukulam AI — Google Drive persistence

## Approved architecture

The signed-in parent's Google Drive is the primary persistence layer for user-owned Gurukulam data. The app uses the least-privilege `https://www.googleapis.com/auth/drive.file` scope and never requests unrestricted Drive access.

## Storage layout

- `Gurukulam AI/`
- `Gurukulam AI/children/`
- Child records are stored as `<childId>.json`.
- Timetable records are stored as `<childId>-timetable.json`.
- Learning workspaces are stored as `<childId>-learning-workspace.json`.

## Security rules

1. Never request `https://www.googleapis.com/auth/drive`.
2. Never store Drive access tokens in GitHub or application source.
3. Drive authorization must be explicitly granted by the signed-in user.
4. Child IDs are application-generated identifiers and immutable after creation.
5. Local browser data is only a temporary cache/draft; Drive is the durable source of truth once authorization is granted.
6. Existing local child records are **never silently uploaded**. Migration requires an explicit parent confirmation.
7. If Drive authorization is unavailable, the UI must clearly distinguish unsynchronized local drafts from Drive-persisted data.

## Implementation status

- Google Identity Services parent sign-in: implemented.
- Google OAuth token client for Drive: implemented.
- `drive.file` least-privilege scope: implemented.
- Gurukulam folder creation/discovery: implemented.
- Child, timetable and learning-workspace persistence: implemented.
- Drive access probing and token expiry recovery: implemented.
- Explicit local-data migration consent: implemented.

The remaining work is verification across browsers/devices and retirement of the legacy backend infrastructure after the frontend/Drive path is confirmed stable.
