# Gurukulam AI — Multi-Task Execution Plan

This is the working execution map for the full Gurukulam AI idea. Every stage is decomposed into levels/sub-stages. Independent levels may be developed in parallel; integration levels wait only on their stated dependencies.

## Status model
- 🔴 Not started
- 🟡 In progress
- 🟢 Complete (implemented + tested)
- 🔵 Accepted (implemented + tested + demonstrated/verified)

Completion percentages are evidence-based. Planning a level does not count as implementation.

## Stage 1 — Foundation
**Estimated idea effort: 1–2 days**
- 1.1 🟡 Repository and application architecture
- 1.2 🟡 React/TypeScript/Vite shell
- 1.3 🟡 Responsive desktop/mobile/tablet design system
- 1.4 🔴 Routing and application state
- 1.5 🔴 Domain models and persistence interfaces
- 1.6 🔴 Error/loading/empty-state framework
- 1.7 🔴 Configuration and environment handling
- 1.8 🔴 Build + typecheck + unit-test baseline
- 1.9 🔴 Foundation acceptance test

## Stage 2 — Google Sign-In + Child Profiles
**Estimated idea effort: 1–2 days**
- 2.1 🟡 Authentication provider abstraction
- 2.2 🔴 Google OAuth integration
- 2.3 🔴 Secure session/token handling
- 2.4 🔴 Parent profile
- 2.5 🔴 Child profile creation/editing
- 2.6 🔴 Grade/age/subject context
- 2.7 🔴 Multi-child selection and active-child context
- 2.8 🔴 Auth/profile tests
- 2.9 🔴 Acceptance test

## Stage 3 — Curriculum, Books, Chapters & Parent Verification
**Estimated idea effort: 3–5 days**
- 3.1 🟡 Curriculum domain model
- 3.2 🟡 Teacher/subject mapping
- 3.3 🔴 Book identification from cover metadata
- 3.4 🔴 Legitimate online-source discovery
- 3.5 🔴 Contents/index extraction
- 3.6 🔴 Chapter detection and page-range mapping
- 3.7 🔴 Page preview/gallery
- 3.8 🔴 Parent Approve workflow
- 3.9 🔴 Wrong-source / Replace workflow
- 3.10 🔴 Parent chapter upload
- 3.11 🔴 OCR/document ingestion pipeline
- 3.12 🔴 Parent-uploaded source becomes authoritative
- 3.13 🔴 Topic/concept extraction
- 3.14 🔴 Curriculum search/navigation
- 3.15 🔴 Curriculum accuracy tests
- 3.16 🔴 Acceptance test

## Stage 4 — AI Tutor Brain
**Estimated idea effort: 4–7 days**
- 4.1 🟡 Tutor policy/response contract
- 4.2 🔴 Child learning profile model
- 4.3 🔴 Curriculum-grounded context builder
- 4.4 🔴 Teaching-plan generator
- 4.5 🔴 Child-level adaptation engine
- 4.6 🔴 Socratic questioning / interaction loop
- 4.7 🔴 Explanation + examples engine
- 4.8 🔴 Knowledge-check engine
- 4.9 🔴 Mistake diagnosis
- 4.10 🔴 Remediation/reteach engine
- 4.11 🔴 Mastery scoring
- 4.12 🔴 Session memory and progress
- 4.13 🔴 AI safety/age-appropriate response policy
- 4.14 🔴 Tutor evaluation suite
- 4.15 🔴 Acceptance test

## Stage 5 — Voice Request & Response
**Estimated idea effort: 3–5 days**
- 5.1 🟡 Provider-neutral voice gateway
- 5.2 🔴 Microphone permission UX
- 5.3 🔴 Speech-to-text
- 5.4 🔴 Voice activity / turn detection
- 5.5 🔴 Tutor request routing
- 5.6 🔴 Text-to-speech
- 5.7 🔴 Interrupt / stop / replay controls
- 5.8 🔴 Voice error/fallback handling
- 5.9 🔴 Child-friendly voice pacing
- 5.10 🔴 Voice latency tests
- 5.11 🔴 End-to-end voice acceptance test

## Stage 6 — Vikram & Raji Teacher Engine
**Estimated idea effort: 2–4 days**
- 6.1 🟡 Teacher persona contract
- 6.2 🔴 Vikram subject assignment: English/Maths/Computer
- 6.3 🔴 Raji assignment: all other subjects
- 6.4 🔴 Teaching style profiles
- 6.5 🔴 Teacher greeting/opening routine
- 6.6 🔴 Explain/ask/check/reteach behaviours
- 6.7 🔴 Teacher memory of current lesson
- 6.8 🔴 Teacher + curriculum integration
- 6.9 🔴 Teacher + voice integration
- 6.10 🔴 Teacher regression tests
- 6.11 🔴 Acceptance test

## Stage 7 — High-Level Animated Teachers
**Estimated idea effort: 5–10 days**
- 7.1 🟡 Animation state contract
- 7.2 🔴 Character asset strategy
- 7.3 🔴 Vikram character implementation
- 7.4 🔴 Raji character implementation
- 7.5 🔴 Idle/listening/thinking/speaking states
- 7.6 🔴 Lip-sync or speech-synchronized animation
- 7.7 🔴 Teaching gestures/reactions
- 7.8 🔴 Emotion/encouragement states
- 7.9 🔴 Mobile/tablet performance optimization
- 7.10 🔴 Animation fallback for weak devices
- 7.11 🔴 Teacher visual acceptance test

## Stage 8 — Testing, Security & Performance
**Estimated idea effort: 4–7 days**
- 8.1 🟡 Automated CI foundation
- 8.2 🔴 Unit-test coverage expansion
- 8.3 🔴 Integration tests
- 8.4 🔴 Curriculum workflow tests
- 8.5 🔴 Authentication/security review
- 8.6 🔴 File-upload validation/security
- 8.7 🔴 AI prompt/input safety tests
- 8.8 🔴 Voice permission/privacy review
- 8.9 🔴 Browser compatibility
- 8.10 🔴 Mobile/tablet testing
- 8.11 🔴 Performance/load checks
- 8.12 🔴 Failure/recovery testing
- 8.13 🔴 Accessibility baseline
- 8.14 🔴 Full regression suite
- 8.15 🔴 Release candidate gate

## Stage 9 — Internet Deployment + Final Acceptance
**Estimated idea effort: 2–4 days**
- 9.1 🔴 Production hosting selection within ₹0 constraint
- 9.2 🔴 Environment/configuration setup
- 9.3 🔴 Domain/HTTPS deployment path
- 9.4 🔴 Production build
- 9.5 🔴 Production authentication configuration
- 9.6 🔴 AI/voice provider configuration
- 9.7 🔴 Monitoring/error visibility
- 9.8 🔴 End-to-end production test
- 9.9 🔴 Desktop acceptance
- 9.10 🔴 Mobile/tablet acceptance
- 9.11 🔴 Parent workflow acceptance
- 9.12 🔴 Tutor/voice/teacher acceptance
- 9.13 🔴 Free-tier feasibility audit
- 9.14 🔴 Final bug sweep
- 9.15 🔴 Final rating report

## Parallel execution lanes

The implementation is intentionally multi-tasking. Independent levels can proceed concurrently:

**Lane A — Platform:** 1.x + 2.x + deployment groundwork 9.x

**Lane B — Curriculum:** 3.x + curriculum test data

**Lane C — AI:** 4.x + child-level adaptation + assessment

**Lane D — Voice:** 5.x + browser voice integration

**Lane E — Teachers:** 6.x + teacher prompts/personas

**Lane F — Animation:** 7.x + visual performance

**Lane G — Quality:** 8.x continuously alongside all lanes

Integration checkpoints occur whenever a dependent lane reaches a usable contract. No stage is considered complete merely because its interface/contract exists.

## Completion calculation

Overall completion is weighted by estimated idea effort, not by the number of stages. Current weights use the midpoint of each stage's estimate. Sub-stage progress rolls up into its parent stage, and parent stages roll up into the overall percentage.

## Non-negotiable project constraints

- No mandatory paid AI/development subscription.
- Internet-first; no requirement for the user's local NVIDIA GPU.
- Accessible from computer, laptop, mobile and tablet.
- Google Sign-In.
- Voice request and response are core features.
- Child-level adaptive teaching.
- High-quality animated Vikram/Raji teachers.
- Parent approval controls the trusted curriculum source.
