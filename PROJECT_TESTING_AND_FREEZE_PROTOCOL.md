# My Gurukulam AI — Browser Testing & Freeze Protocol

## Purpose
This file is a project-level instruction for the final browser-testing phase and the post-testing freeze. It is authoritative for how changes must be handled during this phase.

## 1. One-by-one browser testing
The project owner will test the deployed application in a real browser, one issue at a time.

Workflow:
1. The project owner reports one observed issue/defect.
2. Work **only on that reported issue** unless a directly dependent change is strictly necessary to fix it.
3. Diagnose the issue at micro level, including the relevant UI flow, code path, state, configuration, and deployment implications.
4. Fix the issue in the **correct repository: `vikramiranyan/mygurukulamai`**.
5. Verify the fix as far as the available development/CI tooling permits.
6. Report exactly what was changed and what remains to be browser-verified.
7. Wait for the project owner to test again and confirm whether the issue is resolved.
8. Continue this cycle until the project owner explicitly declares the project ready to freeze.

## 2. No unnecessary changes during browser testing
During this testing phase:
- Do **not** redesign unrelated screens.
- Do **not** refactor unrelated code.
- Do **not** change working functionality merely because a different implementation might be preferable.
- Do **not** introduce new features unless the project owner explicitly requests them.
- Do **not** silently change requirements, architecture, persistence strategy, authentication model, or UX decisions already agreed by the project owner.
- Do **not** use another repository as the target for fixes.
- Preserve all working behavior that the project owner has already accepted.

## 3. Freeze command
The project is considered frozen **only when the project owner explicitly says to freeze/finalize the project** (for example: `FREEZE`, `freeze the project`, or an unambiguous equivalent).

Until that explicit instruction is given, reported browser defects may be fixed according to Section 1.

## 4. After FREEZE
Once the project owner explicitly declares the project frozen:
- Treat the frozen state as **immutable**.
- **Do not modify, delete, refactor, redesign, upgrade, optimize, or otherwise touch project files without the project owner's explicit consent for that change.**
- Do not make "small" cleanup changes, dependency updates, security changes, UI tweaks, or automatic fixes without consent.
- Do not reinterpret silence as permission.
- Do not claim that a change was made with permission if explicit consent was not given.
- If a post-freeze problem is reported, first obtain explicit consent to modify the frozen project, unless the project owner has already explicitly authorized that specific class of change.

## 5. Post-freeze change control
When consent is granted for a post-freeze change:
- Change only the specifically authorized scope.
- Preserve the rest of the frozen state.
- Clearly identify the files/areas changed.
- Re-verify the requested change before considering it complete.

## 6. Source of truth
For this phase, the authoritative project repository is:

`https://github.com/vikramiranyan/mygurukulamai`

The project owner is the final authority on browser acceptance and on when the project enters the frozen state.

## 7. Instruction priority
This protocol exists specifically to prevent accidental scope creep, premature "green light" claims, and unauthorized post-freeze modifications. It must be checked before making changes during the browser-testing/finalization phase.
