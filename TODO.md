# Gurukulam AI — Development TODO

> **Operating rule:** Suggestions received during active development must be recorded here without interrupting the current work. At the end of every development cycle, check this file, select pending work, implement it, verify it, and mark it completed. Never silently discard a suggestion.
>
> **Micro-level quality gate:** Every development cycle must include a micro-level review of affected files and adjacent flows: imports, state transitions, validation, persistence, authorization, error handling, accessibility, responsive behavior, stale/default data, race conditions, edge cases, tests, build output, and deployment behavior. Fix discovered issues before marking work complete.

## Workflow

1. **Capture** — Add every new user suggestion as a pending item immediately.
2. **Continue** — Do not stop or reset the current development task merely because a suggestion arrives.
3. **Prioritize** — Use `P0` for security, data integrity, child safety, production blockers, and broken core functionality; `P1` for important product functionality; `P2` for enhancements; `P3` for polish.
4. **Micro-check** — Inspect each affected file and all directly connected flows at implementation-detail level. Check both the happy path and failure/edge paths.
5. **Implement** — Fix the highest-priority discovered issues without waiting for another confirmation.
6. **Verify** — Run typecheck, unit/integration tests, regression tests, production build, and deployment verification as applicable.
7. **Close** — Mark an item `[x]` only after implementation and verification are complete.
8. **Repeat** — Before declaring any work complete, re-read this TODO and process remaining pending items according to priority.

## Pending / Active Backlog

### P0 — Critical
- [ ] Establish and continuously enforce production-grade child-safety, privacy, authentication, authorization, and data-integrity controls across every user flow.
- [ ] Complete end-to-end production readiness review covering frontend, backend, persistence, AI boundaries, deployment, error handling, abuse resistance, and recovery scenarios.
- [ ] **Micro-level issue checking and fixing across the complete project** — inspect every relevant file/flow for subtle defects and fix them before green-lighting browser testing.

### P1 — High Priority
- [x] Remove hardcoded teacher assignments/default teachers; teachers must exist only after explicit parent creation/configuration and only subjects explicitly assigned to that teacher may use them.
- [x] Allow manual subject add/modify/delete in Time Table / Subjects when no timetable has been uploaded, with the same child-scoped persistence and integrity rules.
- [ ] Build the complete adaptive learning intelligence layer: learner mastery model, misconception detection, remediation, progression, spaced repetition, and personalized difficulty.
- [ ] Complete AI tutor orchestration with safe model routing, context management, grounding, fallback behavior, prompt-injection resistance, and age-appropriate responses.
- [ ] Complete parent dashboard and child learning analytics with actionable progress, mastery, weak areas, recommendations, and privacy-safe reporting.
- [ ] Complete assessment engine for practice, tests, exams, grading, explanations, retry/remediation, and mastery updates.
- [ ] Complete persistent curriculum/content architecture for subjects, chapters, pages, lessons, homework, tests, and parent-controlled teaching scope.
- [x] Make returning Google Drive grants silent so normal navigation does not repeatedly ask for Drive access.

### P2 — Product Expansion
- [ ] Add rich educational media capabilities including diagrams, visual explanations, image understanding, handwriting/workbook analysis, and age-appropriate interactive learning experiences.
- [ ] Expand gamification: XP, levels, badges, streaks, quests, rewards, and healthy motivation without manipulative mechanics.
- [x] Add a first immersive animated teacher layer with speech-linked mouth movement, idle animation, celebration reaction, and a dedicated Mind Gym area.
- [ ] Replace the lightweight animated guide with production-grade configurable 3D teacher assets, phoneme-aware lip-sync, teacher-specific gestures/emotions, and performance-aware 3D rendering. Teacher identity must remain parent-configured; no default named teachers.
- [ ] Add robust offline-first behavior, synchronization, conflict handling, retry queues, and recovery from intermittent connectivity.
- [ ] Add observability: structured logs, metrics, health checks, safe diagnostics, audit trails, and production incident visibility without exposing child data.

### P3 — Polish
- [ ] Expand accessibility, localization, responsive layouts, onboarding, empty states, error states, and parent/child usability testing scenarios.
- [ ] Perform performance optimization across low-end mobile devices, slow networks, asset loading, animation budgets, and bundle size.
- [ ] Maintain documentation for architecture, security model, development workflow, deployment, recovery, and contribution guidelines.

## Completed

- [x] Added this persistent TODO/backlog mechanism and operating workflow.
- [x] Added the micro-level quality-gate requirement to the development workflow.
- [x] Fixed backend CI dependency issue for Google authentication transport (`requests`).
- [x] Verified frontend CI: typecheck, unit/integration tests, regression suite, and production build passed.
- [x] Verified dedicated backend CI: compilation and backend model/schema/security tests passed.
- [x] Removed runtime hardcoded teacher identities and subject-to-teacher mappings; teacher assignment is now explicit parent configuration.
- [x] Removed seeded/default teachers and seeded Today's Teaching entries, including migration of persisted legacy defaults.
- [x] Removed runtime fallback to hardcoded curriculum teachers/chapters from the child learning experience.
- [x] Added manual child-scoped subject management when no timetable exists, with Drive persistence and later timetable merging.
- [x] Allowed manual-subject timetable records to persist without timetable periods.
- [x] Verified the corrected frontend CI: typecheck, unit/integration tests, Stage 8 regression suite, and production build all passed.
- [x] Verified the GitHub Pages build/deploy workflow completed successfully for the corrected build.
- [x] Replaced the legacy DOM child-switcher injection with a cleaner immersive learning layer mounted by the application shell.
- [x] Added speech-linked animated teacher mouth movement so browser TTS visibly drives the teacher's speaking state.
- [x] Added Mind Gym activities for brainstorming, pattern recognition, logic, story building, and curiosity questions.
- [x] Stabilized workspace normalization so missing persisted IDs are deterministic rather than regenerated randomly.

## Change Log

- **2026-09-01:** Created the project TODO mechanism so user suggestions are captured while development continues.
- **2026-09-01:** Added user-requested backlog items for removing hardcoded teacher/subject relationships and enabling manual subject management without a timetable.
- **2026-09-01:** Implemented and verified the requested teacher/subject integrity fixes and manual subject workflow.
- **2026-09-03:** Added the next-generation child experience direction: an animated teacher beside the lesson, speech-linked mouth animation, celebration reaction, and Mind Gym intellectual-development activities. Production-grade configurable 3D teacher characters remain a P2 implementation item.
- **2026-09-03:** User explicitly required micro-level checking for issues and fixing them; added this as a P0 quality gate and active backlog item. Future green lights require this review, not only CI success.
