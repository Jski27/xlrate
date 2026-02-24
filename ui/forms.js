/**
 * forms.js
 * Rendering block/task lists, add forms, inline editing, and recurring logic.
 */

import { state, saveState } from './state.js';
import { esc, showError, today, tomorrow } from './utils.js';

// ── Recurrence helpers ─────────────────────────────────────────────────────────

const RECUR_LABELS = {
  daily:    'Daily',
  weekdays: 'Weekdays',
  weekends: 'Weekends',
  mwf:      'MWF',
  tth:      'TTh',
  weekly:   'Weekly',
};

function recurringSelectHTML(current = 'none') {
  return [
    ['none',     'Once'],
    ['daily',    'Daily'],
    ['weekdays', 'Weekdays'],
    ['weekends', 'Weekends'],
    ['mwf',      'MWF'],
    ['tth',      'TTh'],
    ['weekly',   'Weekly'],
  ].map(([v, l]) =>
    `<option value="${v}"${v === current ? ' selected' : ''}>${l}</option>`
  ).join('');
}

/**
 * Filters blocks to only those relevant for the given date.
 * Non-recurring blocks always pass through.
 */
export function getBlocksForDate(blocks, dateStr) {
  const day       = new Date(dateStr + 'T12:00:00').getDay(); // 0=Sun … 6=Sat
  const isWeekday = day >= 1 && day <= 5;
  const isWeekend = day === 0 || day === 6;

  return blocks.filter(b => {
    const r = b.recurring;
    if (!r || r === 'none') return true;
    if (r === 'daily')      return true;
    if (r === 'weekdays')   return isWeekday;
    if (r === 'weekends')   return isWeekend;
    if (r === 'mwf')        return [1, 3, 5].includes(day);
    if (r === 'tth')        return [2, 4].includes(day);
    if (r === 'weekly')     return b.weeklyDay === day;
    return true;
  });
}

// ── Render ─────────────────────────────────────────────────────────────────────

export function renderBlocks() {
  const list = document.getElementById('blocks-list');
  if (state.blocks.length === 0) {
    list.innerHTML = '<li class="empty">No blocks added yet.</li>';
    return;
  }
  list.innerHTML = state.blocks.map((b, i) => {
    const label = b.recurring && b.recurring !== 'none' ? RECUR_LABELS[b.recurring] : null;
    const badge = label ? `<span class="recur-badge">${label}</span>` : '';
    return `
      <li>
        <span class="item-label">${esc(b.name)}</span>
        <span class="item-detail">${b.start} – ${b.end}</span>
        ${badge}
        <button class="btn-edit"   data-type="block" data-index="${i}" title="Edit">✏</button>
        <button class="btn-remove" data-type="block" data-index="${i}" title="Remove">✕</button>
      </li>
    `;
  }).join('');
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
        <span class="item-detail">${formatDuration(t.durationMins)} · P${t.priority}${deadline}${energy}</span>
        <button class="btn-edit"   data-type="task" data-index="${i}" title="Edit">✏</button>
        <button class="btn-remove" data-type="task" data-index="${i}" title="Remove">✕</button>
      </li>
    `;
  }).join('');
}

// ── Add block ──────────────────────────────────────────────────────────────────

export function addBlock() {
  const name      = document.getElementById('block-name').value.trim();
  const start     = document.getElementById('block-start').value;
  const end       = document.getElementById('block-end').value;
  const recurring = document.getElementById('block-recurring').value;

  if (!name)          return showError('block-name', 'Block name is required.');
  if (!start || !end) return alert('Please set start and end times.');
  if (start >= end)   return alert('Start time must be before end time.');

  const block = { name, start, end };
  if (recurring !== 'none') {
    block.recurring = recurring;
    if (recurring === 'weekly') {
      const dateStr = document.getElementById('plan-date').value || today();
      block.weeklyDay = new Date(dateStr + 'T12:00:00').getDay();
    }
  }

  state.blocks.push(block);
  renderBlocks();
  flashLastItem('blocks-list');
  saveState();

  // UX: reset name, advance start to this block's end, re-focus
  document.getElementById('block-name').value      = '';
  document.getElementById('block-start').value     = end;
  document.getElementById('block-recurring').value = 'none';
  document.getElementById('block-name').focus();
}

// ── Duration helpers ────────────────────────────────────────────────────────────

function parseDuration(str) {
  str = str.trim().toLowerCase();
  if (!str) return NaN;
  if (/^\d+$/.test(str)) return parseInt(str);                        // "30" → 30 mins
  const hm = str.match(/^(\d+(?:\.\d+)?)\s*h(?:r?s?)?\s*(?:(\d+)\s*m?)?$/);
  if (hm) return Math.round(parseFloat(hm[1]) * 60 + parseInt(hm[2] || 0)); // "1h30m", "1.5h"
  const m = str.match(/^(\d+(?:\.\d+)?)\s*m(?:in)?s?$/);
  if (m) return Math.round(parseFloat(m[1]));                         // "90m", "45min"
  const colon = str.match(/^(\d+):(\d{2})$/);
  if (colon) return parseInt(colon[1]) * 60 + parseInt(colon[2]);    // "1:30"
  return NaN;
}

function formatDuration(mins) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// ── Add task ───────────────────────────────────────────────────────────────────

export function addTask() {
  const name        = document.getElementById('task-name').value.trim();
  const durationRaw = document.getElementById('task-duration').value;
  const priority    = parseInt(document.getElementById('task-priority').value);
  const deadline    = document.getElementById('task-deadline').value || undefined;
  const energy      = document.getElementById('task-energy').value   || undefined;

  if (!name)        return showError('task-name',     'Task name is required.');
  if (!durationRaw) return showError('task-duration', 'Duration is required.');

  const durationMins = parseDuration(durationRaw);
  if (isNaN(durationMins) || durationMins <= 0)
    return showError('task-duration', 'Enter a duration like 30m, 1h, or 1.5h');

  state.tasks.push({ name, durationMins, priority, deadline, energy });
  renderTasks();
  flashLastItem('tasks-list');
  saveState();

  document.getElementById('task-name').value     = '';
  document.getElementById('task-duration').value = '';
  document.getElementById('task-deadline').value = '';
  document.getElementById('task-energy').value   = '';
  document.getElementById('task-name').focus();
}

// ── Inline edit: blocks ────────────────────────────────────────────────────────

export function startEditBlock(index) {
  const b  = state.blocks[index];
  const li = document.getElementById('blocks-list').children[index];

  li.classList.add('editing');
  li.innerHTML = `
    <input  class="edit-input" type="text" data-field="name"      value="${esc(b.name)}">
    <input  class="edit-input" type="time" data-field="start"     value="${b.start}">
    <input  class="edit-input" type="time" data-field="end"       value="${b.end}">
    <select class="edit-input"             data-field="recurring">${recurringSelectHTML(b.recurring || 'none')}</select>
    <div class="edit-btns">
      <button class="btn-save-edit">Save</button>
      <button class="btn-cancel-edit">Cancel</button>
    </div>
  `;

  li.querySelector('[data-field="name"]').focus();
  li.querySelector('.btn-save-edit').addEventListener('click',  () => saveEditBlock(index, li));
  li.querySelector('.btn-cancel-edit').addEventListener('click', () => renderBlocks());
  li.querySelector('[data-field="name"]').addEventListener('keydown', e => {
    if (e.key === 'Enter')  saveEditBlock(index, li);
    if (e.key === 'Escape') renderBlocks();
  });
}

function saveEditBlock(index, li) {
  const name      = li.querySelector('[data-field="name"]').value.trim();
  const start     = li.querySelector('[data-field="start"]').value;
  const end       = li.querySelector('[data-field="end"]').value;
  const recurring = li.querySelector('[data-field="recurring"]').value;

  if (!name)      { li.querySelector('[data-field="name"]').style.borderColor = 'var(--danger)'; return; }
  if (start >= end) { li.querySelector('[data-field="end"]').style.borderColor  = 'var(--danger)'; return; }

  const block = { name, start, end };
  if (recurring !== 'none') {
    block.recurring = recurring;
    if (recurring === 'weekly') {
      // Preserve the original weeklyDay; fall back to plan date if new
      block.weeklyDay = state.blocks[index].weeklyDay
        ?? new Date((document.getElementById('plan-date').value || today()) + 'T12:00:00').getDay();
    }
  }

  state.blocks[index] = block;
  saveState();
  renderBlocks();
}

// ── Inline edit: tasks ─────────────────────────────────────────────────────────

export function startEditTask(index) {
  const t  = state.tasks[index];
  const li = document.getElementById('tasks-list').children[index];

  const priorityOpts = [5, 4, 3, 2, 1].map(v =>
    `<option value="${v}"${t.priority === v ? ' selected' : ''}>P${v}</option>`
  ).join('');

  const energyOpts = [['', '—'], ['high', 'High'], ['medium', 'Med'], ['low', 'Low']].map(([v, l]) =>
    `<option value="${v}"${(t.energy || '') === v ? ' selected' : ''}>${l}</option>`
  ).join('');

  li.classList.add('editing');
  li.innerHTML = `
    <input  class="edit-input" type="text" data-field="name"     value="${esc(t.name)}">
    <input  class="edit-input" type="text" data-field="duration" value="${formatDuration(t.durationMins)}" placeholder="e.g. 30m, 1h">
    <select class="edit-input"             data-field="priority">${priorityOpts}</select>
    <input  class="edit-input" type="date" data-field="deadline" value="${t.deadline || ''}">
    <select class="edit-input"             data-field="energy">${energyOpts}</select>
    <div class="edit-btns">
      <button class="btn-save-edit">Save</button>
      <button class="btn-cancel-edit">Cancel</button>
    </div>
  `;

  li.querySelector('[data-field="name"]').focus();
  li.querySelector('.btn-save-edit').addEventListener('click',  () => saveEditTask(index, li));
  li.querySelector('.btn-cancel-edit').addEventListener('click', () => renderTasks());
  li.querySelector('[data-field="name"]').addEventListener('keydown', e => {
    if (e.key === 'Enter')  saveEditTask(index, li);
    if (e.key === 'Escape') renderTasks();
  });
}

function saveEditTask(index, li) {
  const name        = li.querySelector('[data-field="name"]').value.trim();
  const durationRaw = li.querySelector('[data-field="duration"]').value;
  const priority    = parseInt(li.querySelector('[data-field="priority"]').value);
  const deadline    = li.querySelector('[data-field="deadline"]').value || undefined;
  const energy      = li.querySelector('[data-field="energy"]').value   || undefined;

  if (!name) {
    li.querySelector('[data-field="name"]').style.borderColor = 'var(--danger)';
    return;
  }
  const durationMins = parseDuration(durationRaw);
  if (isNaN(durationMins) || durationMins <= 0) {
    li.querySelector('[data-field="duration"]').style.borderColor = 'var(--danger)';
    return;
  }

  state.tasks[index] = { name, durationMins, priority, deadline, energy };
  saveState();
  renderTasks();
}

// ── Demo data ──────────────────────────────────────────────────────────────────

export function loadDemo() {
  document.getElementById('plan-date').value  = today();
  document.getElementById('work-start').value = '08:00';
  document.getElementById('work-end').value   = '22:00';
  document.getElementById('buffer-pct').value = '20';

  state.blocks = [
    { name: 'Math Class', start: '09:00', end: '10:30', recurring: 'mwf'      },
    { name: 'Lunch',      start: '12:00', end: '13:00', recurring: 'weekdays' },
    { name: 'Gym',        start: '17:00', end: '18:00', recurring: 'daily'    },
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

// ── UX helpers ─────────────────────────────────────────────────────────────────

function flashLastItem(listId) {
  const last = document.getElementById(listId).lastElementChild;
  if (!last || last.classList.contains('empty')) return;
  last.classList.add('item-new');
  last.addEventListener('animationend', () => last.classList.remove('item-new'), { once: true });
}
