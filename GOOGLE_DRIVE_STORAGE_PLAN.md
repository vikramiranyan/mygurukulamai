# Gurukulam AI — Google Drive persistence

## Approved architecture

The signed-in parent's Google Drive is the primary persistence layer for user-owned Gurukulam data. The app uses the least-privilege `https://www.googleapis.com/auth/drive.file` scope and never requests unrestricted Drive access.

## Storage layout

- `Gurukulam AI/`
- `Gurukulam AI/children/`
- Child records are stored as `<childId>.json`.
- Future timetable documents and structured timetable records are stored under the same application-owned folder hierarchy.

## Security rules

1. Never request `https://www.googleapis.com/auth/drive`.
2. Never store Drive access tokens in GitHub or application source.
3. Drive authorization must be explicitly granted by the signed-in user.
4. Child IDs remain server/application-generated identifiers and are immutable after creation.
5. The app should gracefully fall back to the existing local draft only while Drive authorization is unavailable; it must clearly tell the parent when data has not been synchronized.
6. Existing local child records must never be silently uploaded. Migration requires explicit user confirmation.

## Implementation status

The Drive storage adapter is implemented in `src/storage/googleDrive.ts`. Full UI OAuth integration and migration are the next steps because the current Google Identity Services login flow produces an ID credential, not a Drive API access token.
