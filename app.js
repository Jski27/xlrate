/**
 * app.js — entry point
 * Wires up event listeners and initialises the app.
 * Business logic lives in core/; UI logic lives in ui/.
 */

import { generatePlan } from './core/engine.js';
import { state, loadState, saveState } from './ui/state.js';
import { renderBlocks, renderTasks, addBlock, addTask, loadDemo,
         startEditBlock, startEditTask, getBlocksForDate } from './ui/forms.js';
import { renderOutput } from './ui/output.js';
import { today } from './ui/utils.js';

// ── Generate ───────────────────────────────────────────────────────────────────

function generate() {
  const date      = document.getElementById('plan-date').value;
  const workStart = document.getElementById('work-start').value;
  const workEnd   = document.getElementById('work-end').value;
  const bufferPct = parseInt(document.getElementById('buffer-pct').value);

  if (!date)                    return alert('Please select a date.');
  if (!workStart || !workEnd)   return alert('Please set work start and end times.');
  if (workStart >= workEnd)     return alert('Work start must be before work end.');
  if (state.tasks.length === 0) return alert('Add at least one task to schedule.');

  // Filter blocks to only those applicable for the selected date
  const blocksForDate = getBlocksForDate(state.blocks, date);

  try {
    const result = generatePlan(date, { workStart, workEnd, bufferPct }, blocksForDate, state.tasks);
    renderOutput(result, blocksForDate, { workStart, workEnd });
  } catch (err) {
    alert('Error generating plan: ' + err.message);
  }
}

// ── Event listeners ────────────────────────────────────────────────────────────

document.getElementById('add-block-btn').addEventListener('click', addBlock);
document.getElementById('add-task-btn').addEventListener('click', addTask);
document.getElementById('generate-btn').addEventListener('click', generate);
document.getElementById('demo-btn').addEventListener('click', loadDemo);

document.getElementById('block-name').addEventListener('keydown',    e => { if (e.key === 'Enter') addBlock(); });
document.getElementById('task-name').addEventListener('keydown',     e => { if (e.key === 'Enter') addTask();  });
document.getElementById('task-duration').addEventListener('keydown', e => { if (e.key === 'Enter') addTask();  });

// Edit + remove via event delegation
document.addEventListener('click', e => {
  const editBtn = e.target.closest('.btn-edit');
  if (editBtn) {
    const index = parseInt(editBtn.dataset.index);
    if (editBtn.dataset.type === 'block') startEditBlock(index);
    else                                   startEditTask(index);
    return;
  }

  const removeBtn = e.target.closest('.btn-remove');
  if (removeBtn) {
    const index = parseInt(removeBtn.dataset.index);
    if (removeBtn.dataset.type === 'block') {
      state.blocks.splice(index, 1);
      renderBlocks();
    } else {
      state.tasks.splice(index, 1);
      renderTasks();
    }
    saveState();
  }
});

// Persist config changes
['work-start', 'work-end', 'buffer-pct'].forEach(id => {
  document.getElementById(id).addEventListener('change', saveState);
});

// ── UI panel state (separate from data state) ──────────────────────────────────

const UI_KEY = 'xlrate_ui';

function loadUiState() {
  try { return JSON.parse(localStorage.getItem(UI_KEY)) || {}; }
  catch { return {}; }
}

function saveUiState(patch) {
  localStorage.setItem(UI_KEY, JSON.stringify({ ...loadUiState(), ...patch }));
}

function initPanels() {
  const ui = loadUiState();

  // Settings toggle (config panel hidden by default)
  const configPanel = document.getElementById('config-panel');
  const settingsBtn = document.getElementById('settings-btn');
  let settingsOpen  = ui.settingsOpen ?? false;

  function applySettings() {
    configPanel.classList.toggle('panel-hidden', !settingsOpen);
    settingsBtn.setAttribute('aria-expanded', String(settingsOpen));
  }

  settingsBtn.addEventListener('click', () => {
    settingsOpen = !settingsOpen;
    applySettings();
    saveUiState({ settingsOpen });
  });

  applySettings();

  // Blocks collapse
  const blocksBody   = document.getElementById('blocks-body');
  const blocksToggle = document.getElementById('blocks-toggle');
  let blocksCollapsed = ui.blocksCollapsed ?? false;

  function applyBlocks() {
    blocksBody.classList.toggle('panel-collapsed', blocksCollapsed);
    blocksToggle.classList.toggle('is-collapsed', blocksCollapsed);
    blocksToggle.setAttribute('aria-expanded', String(!blocksCollapsed));
  }

  blocksToggle.addEventListener('click', () => {
    blocksCollapsed = !blocksCollapsed;
    applyBlocks();
    saveUiState({ blocksCollapsed });
  });

  applyBlocks();

  // Tasks collapse
  const tasksBody   = document.getElementById('tasks-body');
  const tasksToggle = document.getElementById('tasks-toggle');
  let tasksCollapsed = ui.tasksCollapsed ?? false;

  function applyTasks() {
    tasksBody.classList.toggle('panel-collapsed', tasksCollapsed);
    tasksToggle.classList.toggle('is-collapsed', tasksCollapsed);
    tasksToggle.setAttribute('aria-expanded', String(!tasksCollapsed));
  }

  tasksToggle.addEventListener('click', () => {
    tasksCollapsed = !tasksCollapsed;
    applyTasks();
    saveUiState({ tasksCollapsed });
  });

  applyTasks();
}

// ── Init ───────────────────────────────────────────────────────────────────────

document.getElementById('plan-date').value = today();
loadState();
renderBlocks();
renderTasks();
initPanels();
