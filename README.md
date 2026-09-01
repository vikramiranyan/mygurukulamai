# Gurukulam AI

A browser-first, parent-controlled AI tutoring platform.

## Fixed project requirements

- ₹0 / no mandatory paid AI subscription or development tool.
- Internet-first: usable from desktop, laptop, mobile and tablet; no local AI/GPU requirement.
- Google Sign-In for parent identity.
- The signed-in parent's Google Drive is the primary user-owned persistence layer.
- Google Drive access uses the least-privilege `drive.file` scope; Gurukulam never requests unrestricted Drive access.
- AI teaching, reasoning, assessment and adaptive learning.
- Voice request and voice response are core interactions.
- High-quality animated teacher characters.
- Teacher **Vikram**: English, Maths, Computer.
- Teacher **Raji**: EVS, Hindi, GK and other subjects.
- Parent chooses today's topic.
- Gurukulam finds/maps the chapter and page range where legitimately available.
- Parent must approve an automatically mapped chapter before it becomes trusted curriculum.
- If the mapping/source is wrong, parent can upload the particular chapter and that uploaded source becomes authoritative.

## Architecture

```text
Google Sign-In
      ↓
Gurukulam AI browser app
      ├── Google Drive (user-owned learning data)
      ├── Browser cache/local drafts (temporary/offline support)
      └── AI/voice providers (only through their supported client-safe flows)
```

There is no required Express application server or PostgreSQL database in the target architecture. Legacy backend files are being retired after frontend/Drive verification so no learning data path is broken during migration.

## Google Drive data layout

```text
Gurukulam AI/
└── children/
    ├── <childId>.json
    ├── <childId>-timetable.json
    └── <childId>-learning-workspace.json
```

Existing local child data is **never silently uploaded**. If a device contains a meaningful local child record, Gurukulam asks the parent for explicit consent before migrating it to Drive.

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
