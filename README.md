# Gurukulam AI

A browser-first, parent-controlled AI tutoring platform.

## Fixed project requirements

- ₹0 / no mandatory paid AI subscription or development tool.
- Internet-first: usable from desktop, laptop, mobile and tablet; no local AI/GPU requirement.
- Google Sign-In.
- AI teaching, reasoning, assessment and adaptive learning.
- Voice request and voice response are core interactions.
- High-quality animated teacher characters.
- Teacher **Vikram**: English, Maths, Computer.
- Teacher **Raji**: EVS, Hindi, GK and other subjects.
- Parent chooses today's topic.
- Gurukulam finds/maps the chapter and page range where legitimately available.
- Parent must approve an automatically mapped chapter before it becomes trusted curriculum.
- If the mapping/source is wrong, parent can upload the particular chapter and that uploaded source becomes authoritative.

## Development stages

1. Foundation
2. Google authentication and child profiles
3. Curriculum database + source verification/upload
4. Tutor Brain
5. Voice
6. Teacher engine (Vikram/Raji)
7. Animated teachers
8. Testing, security and performance hardening
9. Internet deployment and final acceptance rating

## Current milestone

Stage 1 foundation is initialized with a responsive parent curriculum-verification interface and the teacher-assignment smoke tests. The source repository is intentionally separate from `My-Gurukulam-AI`, which remains the legacy/reference project.

## Local development

Node.js 20+ is recommended. Run:

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

The production deployment will be configured after the authentication, API and AI service choices are implemented and tested.
