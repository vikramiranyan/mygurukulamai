# My Gurukulam AI — AI Development Rules

## PURPOSE
This file is a mandatory development contract for any AI assistant, coding agent, or developer working on this repository.

## 1. CORE PROJECT REQUIREMENTS — DO NOT CHANGE WITHOUT EXPLICIT USER APPROVAL
- Authentication/Login: Google Sign-In.
- Data Storage: Google Drive.
- Supported devices: mobile, tablet, and laptop/desktop.
- The application must remain responsive across all three device categories.

## 2. FROZEN PAGES — ABSOLUTE PROTECTION
When the user says **FREEZE <page>** or **freeze the <page> page**, that page becomes FROZEN.

Once a page is frozen:
- DO NOT modify its UI, layout, styling, text, components, routes, behaviour, validation, authentication flow, or underlying code.
- DO NOT refactor, rename, reorganize, optimize, format, or "clean up" code belonging to the frozen page.
- DO NOT modify files solely because they contain code used by the frozen page.
- DO NOT make indirect changes that alter the frozen page's appearance or behaviour.
- Do not touch a frozen page even when fixing another feature, unless the user explicitly authorizes that specific modification.
- If a requested change would require touching a frozen page, STOP and tell the user before making any change.

The word **FREEZE** is an explicit protection instruction. Treat it as higher priority than normal development convenience.

## 3. UNFREEZING / MODIFYING A FROZEN PAGE
A frozen page may be changed ONLY when the user explicitly asks for that page to be modified.
Examples of valid authorization:
- "Modify the frozen Login page."
- "Unfreeze the Login page and change the Google Sign-In button."

A general request such as "fix the app", "improve the UI", "refactor", or "fix authentication" is NOT permission to modify a frozen page.

## 4. BEFORE EVERY CODE CHANGE
Before editing any file:
1. Check this file for project rules.
2. Identify whether the target page or any affected page is frozen.
3. Determine the minimum files required for the requested change.
4. Avoid touching unrelated files.
5. If a frozen page could be affected directly or indirectly, stop and ask for explicit authorization.

## 5. CHANGE DISCIPLINE
- Prefer the smallest possible change that solves the requested problem.
- Do not rewrite working code unnecessarily.
- Do not introduce new dependencies unless necessary.
- Do not change working functionality while fixing an unrelated issue.
- Do not claim a change is safe without checking its impact on existing functionality.
- After changes, run the available typecheck/tests/build where practical.

## 6. USER AUTHORITY
The user's explicit instructions control page freeze/unfreeze status.
Never infer permission to modify a frozen page from context.

## 7. RECORD OF FROZEN PAGES
Current frozen pages: NONE

When the user freezes a page, update this section with the exact page name and, where possible, its route and primary source file(s). Do not remove a freeze unless the user explicitly authorizes it.
