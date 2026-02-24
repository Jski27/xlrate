# xlrate — Execution OS Daily Planner

**Live:** [xl.joeykoski.com](https://xl.joeykoski.com)

A lightweight, browser-based daily scheduler. You define what time is already spoken for, add the tasks you need to get done, and it produces a time-blocked schedule with a transparent, inspectable heuristic.

---

## What it does

1. **Accepts non-negotiable blocks** — classes, meetings, sleep, anything fixed.
2. **Accepts flexible tasks** — each with a duration, priority (1–5), optional deadline, and optional energy level.
3. **Computes free windows** — subtracts your blocks from the configured work day, then applies a buffer (default 20%) to avoid scheduling every last minute.
4. **Schedules tasks** — sorts by deadline urgency → priority → energy → duration, then greedily places tasks into the earliest available window that fits. No task is split.
5. **Shows spillover** — tasks that didn't fit are listed separately so nothing gets lost.

---

## Scheduling heuristic

Sort order (ties broken by the next criterion):

| # | Criterion | Direction |
|---|---|---|
| 1 | Deadline urgency | Soonest first |
| 2 | Priority | Highest (5) first |
| 3 | Energy | High → Medium → Low (places demanding work earlier) |
| 4 | Duration | Shortest first |

Tasks without a deadline sort after all tasks that have one.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Core engine | Plain ES modules (no framework) | Portable — runs in browser, Node, or any future runtime |
| UI | Vanilla HTML / CSS / JS | No build step, easy to read and extend |
| Tests | Node built-in `node:test` | Zero extra dependencies |
| Hosting | Netlify (static) | Auto-deploys on push, free tier, custom domain |

---

## Project structure

```
xlrate/
├── core/
│   ├── models.js        # Shape validators for Config, Block, Task
│   ├── timeUtils.js     # HH:MM ↔ minutes, interval subtraction
│   ├── windowCalc.js    # Subtracts blocks from work day + applies buffer
│   ├── scheduler.js     # Sorts tasks + greedy placement
│   └── engine.js        # generatePlan() — the single public API
├── tests/
│   ├── timeUtils.test.js
│   ├── windowCalc.test.js
│   └── scheduler.test.js
├── index.html           # Single-page UI
├── style.css
├── app.js               # UI logic — imports generatePlan() directly
└── package.json
```

The UI never imports anything except `engine.js`. The core engine has no knowledge of the DOM.

---

## Data shapes

**Config**
```json
{ "workStart": "08:00", "workEnd": "22:00", "bufferPct": 20 }
```

**Block** (non-negotiable)
```json
{ "name": "Math Class", "start": "09:00", "end": "10:30" }
```

**Task**
```json
{
  "name": "Write essay draft",
  "durationMins": 90,
  "priority": 4,
  "deadline": "2026-02-25",
  "energy": "high"
}
```
`deadline` and `energy` are optional. `priority` is 1–5 (5 = highest). `energy` is `"high"`, `"medium"`, or `"low"`.

**generatePlan() return value**
```json
{
  "windows":  [{ "start": "08:00", "end": "09:00", "durationMins": 60 }],
  "schedule": [{ "start": "08:00", "end": "09:30", "task": "Write essay draft", "durationMins": 90 }],
  "spillover": [],
  "meta": { "totalAvailableMins": 480, "schedulableMins": 384, "scheduledMins": 210 }
}
```

---

## Running locally

```bash
git clone https://github.com/Jski27/xlrate.git
cd xlrate
npm run dev
# → open http://localhost:3000
```

> ES modules require a server — do not open `index.html` directly as a file.

**Run tests:**
```bash
npm test
```

---

## Deploying

The repo auto-deploys to Netlify on every push to `main`. No build step — Netlify serves the files as-is from the repo root.

To set up from scratch:
1. Connect repo to Netlify → publish directory `.` → no build command
2. Add custom domain alias in Netlify site settings
3. Point DNS (CNAME or Netlify DNS record) to the generated `.netlify.app` URL

---

## Roadmap

| Priority | Feature |
|---|---|
| High | Google Calendar integration — auto-import blocks |
| Medium | Save / load named schedule configurations |
| Medium | Multi-day planning view |
| Low | Visual timeline output |
| Low | Energy-aware window matching (assign high-energy tasks to morning slots explicitly) |

---

## Contributing

This is a personal project. If you're jumping in:

- Keep the core engine framework-agnostic (no DOM, no fetch, no Node-specific APIs in `core/`)
- New scheduling logic belongs in `core/scheduler.js` with a corresponding test
- The UI calls only `generatePlan()` — don't let UI concerns leak into core
- Run `npm test` before committing
