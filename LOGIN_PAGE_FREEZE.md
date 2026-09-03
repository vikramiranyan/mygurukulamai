# Gurukulam AI — Login Page Freeze

**Status: FROZEN**

The Gurukulam AI login page is frozen as of 2026-09-03.

## Frozen scope

The login-page visual design and behavior approved immediately before this freeze are the baseline for browser testing, including:

- Full-screen Gurukulam AI login artwork and responsive composition.
- Google Sign-In button colour, border, shape, typography, and Google-colour G treatment.
- Google Sign-In interaction and runtime authentication flow.
- Login-page spacing, positioning, responsive breakpoints, and supporting visual elements.

## Rules during browser testing

1. **Do not make changes to the login page without Vikram Iranyan's explicit consent.**
2. Browser testing may proceed against the frozen baseline.
3. If a login-page defect is discovered during testing, record it first; do not silently modify the frozen design.
4. A login-page fix may be implemented only after explicit approval for that specific change.
5. Approved fixes must be narrowly scoped to the reported issue and validated with the applicable typecheck, tests, build, and deployment checks.
6. Do not use a login-page defect as a reason to introduce unrelated redesigns, refactors, dependency changes, or architectural changes.

## Unfreezing

The login page becomes editable again only when Vikram Iranyan explicitly authorizes changes to the login page.

Until then, this file is the project-level instruction for the login-page testing phase.
