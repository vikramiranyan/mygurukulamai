# Gurukulam AI

A browser-first, parent-controlled AI tutoring platform.

## Fixed project requirements

- ₹0 / no mandatory paid AI subscription or development tool.
- Internet-first: usable from desktop, laptop, mobile and tablet; no local AI/GPU requirement.
- Google Sign-In for parent identity.
- The signed-in parent's Google Drive is the **only persistent user-data store** for the hosted application.
- No localStorage, sessionStorage, IndexedDB, browser database, or browser-resident child-data cache is used for application persistence.
- No FastAPI/PostgreSQL backend is required or used by the hosted application.
- AI teaching, reasoning, assessment and adaptive learning.
- Voice request and voice response are core interactions.
- High-quality animated teacher characters.
- Teacher identities, roles and subject assignments are created and controlled by the parent; there are no seeded/default named teachers.
- Parent chooses today's topic.
- Gurukulam finds/maps the chapter and page range where legitimately available.
- Parent must approve an automatically mapped chapter before it becomes trusted curriculum.
- If the mapping/source is wrong, parent can upload the particular chapter and that uploaded source becomes authoritative.

## Architecture

```text
Google Sign-In
      ↓
Gurukulam AI browser app
      ├── Google Drive (sole persistent user-data store)
      └── AI/voice providers (only through supported client-safe flows)
```

The hosted application is intentionally **backend-free**. There is no FastAPI service, PostgreSQL database, Git-backed user registry, or browser storage in the production data path. All child profiles, timetable data, teacher configuration, curriculum workspace and learning progress are loaded from and saved to the authenticated parent's Google Drive.

Google Drive access currently uses the full `https://www.googleapis.com/auth/drive` scope because the application must be able to discover and update existing Gurukulam records already present in the parent's Drive, including records created by earlier versions of the application. OAuth access tokens are kept only in runtime memory and are never persisted to browser storage. This scope should be reduced to `drive.file` only after an explicit migration strategy is implemented and verified for existing user records.

## Google Drive data layout

```text
Google Drive
└── Gurukulam AI/
    └── children/
        ├── <childId>.json
        ├── <childId>-timetable.json
        └── <childId>-learning-workspace.json
```

The application treats Google Drive as the authoritative persistent source. It does not silently fall back to browser storage.

## Configuration

- Root `/.env.example` documents frontend build-time configuration.
- `VITE_GOOGLE_CLIENT_ID` may be supplied for the Google OAuth web client; the currently configured project client ID remains the fallback when it is omitted.
- Provider secrets must never be committed. The repository `.gitignore` excludes local environment files, build output, caches and editor artifacts.

## Development

Node.js 24 is the CI baseline. Run:

```bash
npm install
npm run dev
```

Tests:

```bash
npm test
```

Type check:

```bash
npm run typecheck
```

Production build:

```bash
npm run build
```

## Development stages

1. Foundation
2. Google authentication + Drive persistence + child profiles
3. Curriculum + source verification/upload
4. Tutor Brain
5. Voice
6. Teacher engine
7. Animated teachers
8. Testing, security and performance
9. Internet deployment and final acceptance
