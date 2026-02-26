# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run all tests
npm test

# Run a single test file
node --test tests/scheduler.test.js

# Start local dev server (ES modules require a server — do not open index.html directly)
npm run dev   # serves at http://localhost:3000
```

## Architecture

This is a no-build, no-framework browser app. ES modules are used natively throughout.

**Core engine** (`core/`) is completely DOM-free and framework-agnostic:
- `engine.js` — the single public API; exports `generatePlan(date, config, blocks, tasks)`. UI must only import from here.
- `windowCalc.js` — subtracts fixed blocks from the work day and applies the buffer percentage to produce schedulable windows.
- `scheduler.js` — sorts tasks (deadline urgency → priority → energy → duration), then greedily places them into windows. Tasks are never split across windows.
- `timeUtils.js` — HH:MM ↔ minutes-since-midnight conversion utilities.
- `models.js` — shape validators for Config, Block, Task.

**UI layer** (`ui/`):
- `state.js` — single mutable object (`state.blocks`, `state.tasks`) shared by reference across all UI modules. Also owns `localStorage` persistence with schema versioning (`SCHEMA_VERSION = 2`); an incompatible version wipes saved state.
- `forms.js` — block/task list rendering, add forms, inline editing, recurring block logic, and the `parseDuration()` helper (accepts formats like `30`, `30m`, `1h`, `1.5h`, `1:30`).
- `output.js` — renders the visual calendar view at 1.2px/min. Blocks render as `.cal-event--block`; scheduled tasks as `.cal-event--task`.
- `utils.js` — small helpers (`esc()` for XSS-safe HTML, `today()`, `tomorrow()`, `showError()`).

**Entry point** (`app.js`) wires DOM event listeners to the UI modules and calls `generatePlan()` on generate.

## Key constraints

- **Core engine must stay framework-agnostic**: no DOM, no `fetch`, no Node-specific APIs in `core/`.
- **UI imports only `engine.js`** from core — never individual core modules.
- **New scheduling logic** belongs in `core/scheduler.js` with a corresponding test in `tests/scheduler.test.js`.
- **Deployment**: Netlify auto-deploys `main` with no build step; publish directory is `.` (repo root).

## Git workflow

- **Never push directly to `main`**. All changes: open a GitHub issue → feature branch → PR → merge → delete branch.
- **One issue = one branch = one PR.** If a branch feels large, the issue needs to be broken down first.
- Branch naming: `feature/<short-description>`, `fix/<short-description>`, `refactor/<short-description>`
- Run `npm test` before creating a PR.

## Versioning

Semantic versioning: `vMAJOR.MINOR.PATCH`. Every merge that meaningfully changes behavior should increment the version.

Release process: merge PR → tag release → push tag → confirm Netlify deploy.

## Before implementing any feature

1. Restate the issue clearly.
2. Define acceptance criteria.
3. Identify the smallest executable slice.
4. If it touches multiple layers (UI, engine, storage), implement in vertical slices — do not refactor unrelated components.

If you detect feature creep, expanding scope, or unrequested enhancements, stop and ask for clarification.

## Data shapes

All times are `"HH:MM"` strings at the boundaries; internally `core/` works in minutes since midnight.

| Field | Type | Notes |
|---|---|---|
| `priority` | 1–5 integer | 5 = highest urgency |
| `energy` | `"high"` \| `"medium"` \| `"low"` | optional; defaults to medium in sort |
| `deadline` | `"YYYY-MM-DD"` | optional; deadline-less tasks sort last |
| `recurring` | `"none"` \| `"daily"` \| `"weekdays"` \| `"weekends"` \| `"mwf"` \| `"tth"` \| `"weekly"` | blocks only; `"weekly"` also stores `weeklyDay` (0–6) |
