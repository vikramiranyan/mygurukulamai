# Gurukulam AI

A browser-first, parent-controlled AI tutoring platform.

## Fixed project requirements

- ₹0 / no mandatory paid AI subscription or development tool.
- Internet-first: usable from desktop, laptop, mobile and tablet; no local AI/GPU requirement.
- Google Sign-In for parent identity.
- The signed-in parent's Google Drive is the primary user-owned persistence layer for the hosted GitHub Pages application.
- Google Drive access uses the least-privilege `drive.file` scope; Gurukulam never requests unrestricted Drive access.
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
      ├── Google Drive (primary user-owned learning data)
      ├── Browser cache/local drafts (temporary/offline support)
      └── AI/voice providers (only through their supported client-safe flows)
```

The GitHub Pages deployment does **not** depend on the FastAPI/PostgreSQL backend. The `/backend` directory is retained as an optional, self-hosted API implementation for future deployments and is not part of the hosted application's runtime data path. It must never be treated as a second source of truth for the GitHub Pages application.

The hosted frontend therefore has one authoritative persistence path: the authenticated parent's Google Drive. Backend code is maintained separately so it can be deployed independently without creating a split-brain data model.

## Google Drive data layout

```text
Gurukulam AI/
└── children/
    ├── <childId>.json
    ├── <childId>-timetable.json
    └── <childId>-learning-workspace.json
```

Existing local child data is **never silently uploaded**. If a device contains a meaningful local child record, Gurukulam asks the parent for explicit consent before migrating it to Drive.

## Configuration

- Root `/.env.example` documents **frontend build-time/browser configuration**.
- `/backend/.env.example` documents **server-only FastAPI configuration and secrets**.
- Never commit either real `.env` file or provider secrets. The repository `.gitignore` excludes local environment files, build output, Python virtual environments, caches and editor artifacts.

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
