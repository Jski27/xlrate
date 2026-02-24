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

document.getElementById('block-name').addEventListener('keydown', e => { if (e.key === 'Enter') addBlock(); });
document.getElementById('task-name').addEventListener('keydown',  e => { if (e.key === 'Enter') addTask();  });

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

// ── Init ───────────────────────────────────────────────────────────────────────

document.getElementById('plan-date').value = today();
loadState();
renderBlocks();
renderTasks();
