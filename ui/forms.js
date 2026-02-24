/**
 * forms.js
 * Rendering the block/task lists and handling the add-item forms.
 * Inline editing (v2 phase 5) will be added here.
 */

import { state, saveState } from './state.js';
import { esc, showError, today, tomorrow } from './utils.js';

// ── Render ─────────────────────────────────────────────────────────────────────

export function renderBlocks() {
  const list = document.getElementById('blocks-list');
  if (state.blocks.length === 0) {
    list.innerHTML = '<li class="empty">No blocks added yet.</li>';
    return;
  }
  list.innerHTML = state.blocks.map((b, i) => `
    <li>
      <span class="item-label">${esc(b.name)}</span>
      <span class="item-detail">${b.start} – ${b.end}</span>
      <button class="btn-remove" data-type="block" data-index="${i}" title="Remove">✕</button>
    </li>
  `).join('');
}

export function renderTasks() {
  const list = document.getElementById('tasks-list');
  if (state.tasks.length === 0) {
    list.innerHTML = '<li class="empty">No tasks added yet.</li>';
    return;
  }
  list.innerHTML = state.tasks.map((t, i) => {
    const deadline = t.deadline ? ` · ${t.deadline}` : '';
    const energy   = t.energy   ? ` · ${t.energy}`   : '';
    return `
      <li>
        <span class="item-label">${esc(t.name)}</span>
        <span class="item-detail">${t.durationMins}m · P${t.priority}${deadline}${energy}</span>
        <button class="btn-remove" data-type="task" data-index="${i}" title="Remove">✕</button>
      </li>
    `;
  }).join('');
}

// ── Add ────────────────────────────────────────────────────────────────────────

export function addBlock() {
  const name  = document.getElementById('block-name').value.trim();
  const start = document.getElementById('block-start').value;
  const end   = document.getElementById('block-end').value;

  if (!name)          return showError('block-name', 'Block name is required.');
  if (!start || !end) return alert('Please set start and end times.');
  if (start >= end)   return alert('Start time must be before end time.');

  state.blocks.push({ name, start, end });
  renderBlocks();
  saveState();
  document.getElementById('block-name').value = '';
}

export function addTask() {
  const name        = document.getElementById('task-name').value.trim();
  const durationRaw = document.getElementById('task-duration').value;
  const priority    = parseInt(document.getElementById('task-priority').value);
  const deadline    = document.getElementById('task-deadline').value || undefined;
  const energy      = document.getElementById('task-energy').value   || undefined;

  if (!name)        return showError('task-name',     'Task name is required.');
  if (!durationRaw) return showError('task-duration', 'Duration is required.');

  const durationMins = parseInt(durationRaw);
  if (durationMins <= 0) return showError('task-duration', 'Duration must be positive.');

  state.tasks.push({ name, durationMins, priority, deadline, energy });
  renderTasks();
  saveState();
  document.getElementById('task-name').value     = '';
  document.getElementById('task-duration').value = '';
  document.getElementById('task-deadline').value = '';
  document.getElementById('task-energy').value   = '';
}

// ── Demo ───────────────────────────────────────────────────────────────────────

export function loadDemo() {
  document.getElementById('plan-date').value  = today();
  document.getElementById('work-start').value = '08:00';
  document.getElementById('work-end').value   = '22:00';
  document.getElementById('buffer-pct').value = '20';

  state.blocks = [
    { name: 'Math Class', start: '09:00', end: '10:30' },
    { name: 'Lunch',      start: '12:00', end: '13:00' },
    { name: 'Gym',        start: '17:00', end: '18:00' },
  ];
  renderBlocks();
  saveState();

  state.tasks = [
    { name: 'Problem set 3',            durationMins: 120, priority: 5, deadline: today(),    energy: 'high'   },
    { name: 'Write essay draft',        durationMins:  90, priority: 4, deadline: tomorrow(), energy: 'high'   },
    { name: 'Read chapter 7',           durationMins:  45, priority: 3,                       energy: 'medium' },
    { name: 'Email professor',          durationMins:  15, priority: 3,                       energy: 'low'    },
    { name: 'Review lecture notes',     durationMins:  30, priority: 2,                       energy: 'low'    },
    { name: 'Research project outline', durationMins:  60, priority: 3,                       energy: 'medium' },
    { name: 'Practice problems',        durationMins:  75, priority: 2,                       energy: 'medium' },
  ];
  renderTasks();
  saveState();
}
