/**
 * state.js
 * Single source of truth for blocks and tasks.
 * Also owns localStorage persistence with schema versioning.
 *
 * Using a plain object so ES module importers always hold the same reference —
 * safe to reassign state.blocks / state.tasks without breaking other modules.
 */

export const state = {
  blocks: [],
  tasks:  [],
};

const STORAGE_KEY    = 'xlrate_state';
const SCHEMA_VERSION = 2;

export function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    version: SCHEMA_VERSION,
    blocks:  state.blocks,
    tasks:   state.tasks,
    config: {
      workStart: document.getElementById('work-start').value,
      workEnd:   document.getElementById('work-end').value,
      bufferPct: document.getElementById('buffer-pct').value,
    },
  }));
}

export function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    // Incompatible schema — wipe and start fresh
    if (saved.version !== SCHEMA_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    if (saved.blocks) state.blocks = saved.blocks;
    if (saved.tasks)  state.tasks  = saved.tasks;
    if (saved.config) {
      if (saved.config.workStart)              document.getElementById('work-start').value = saved.config.workStart;
      if (saved.config.workEnd)                document.getElementById('work-end').value   = saved.config.workEnd;
      if (saved.config.bufferPct !== undefined) document.getElementById('buffer-pct').value = saved.config.bufferPct;
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}
