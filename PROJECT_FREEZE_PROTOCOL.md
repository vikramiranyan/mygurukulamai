# Project Freeze & Browser Testing Protocol

## Purpose
This document governs the final browser-testing and project-freeze phase of Gurukulam AI.

## 1. Before the project is frozen
- Browser testing is expected and encouraged.
- Observed issues may be fixed directly in the authoritative repository.
- Issues are handled one at a time, with the smallest safe change that resolves the observed problem.
- Every fix must receive appropriate validation: typecheck/tests/build, and deployment verification when applicable.
- Unrelated refactors, speculative redesigns, dependency churn, or scope expansion must not be mixed into an issue-specific fix.

## 2. Browser-testing rule
During browser testing, fixes must be driven by an observed or reproducible issue. After each fix:
1. Reproduce/understand the issue.
2. Apply the targeted fix.
3. Run the relevant automated checks.
4. Verify the deployment is healthy.
5. Ask the user to retest the affected flow when browser verification is required.

## 3. Project freeze
The project is considered **FROZEN only when the project owner explicitly declares the project frozen or gives explicit freeze approval**. A page-level or feature-level freeze does not automatically freeze the entire project.

## 4. After the project is frozen
**NO source, configuration, documentation, dependency, asset, workflow, deployment, or other project changes may be made without the project owner's explicit consent.** This includes seemingly minor fixes or cleanup.

No post-freeze change may be made merely because it appears beneficial, cleaner, safer, or technically preferable.

## 5. Post-freeze change procedure
If a post-freeze change is proposed:
- Clearly state the issue and why a change is required.
- Define the exact proposed scope.
- Obtain explicit consent from the project owner.
- Make only the approved change.
- Run targeted validation and report the result.

## 6. Repository authority
The GitHub repository `vikramiranyan/mygurukulamai` is the authoritative project repository. Testing and fixes must remain aligned with that repository.

## 7. Security and production issues
A suspected security or production-critical issue must still be brought to the project owner for explicit approval before changing the frozen project, unless the owner later establishes a different emergency procedure.
