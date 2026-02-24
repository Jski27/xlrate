import { generatePlan } from './core/engine.js';

// ── State ──────────────────────────────────────────────────────────────────────
let blocks = [];
let tasks  = [];

const STORAGE_KEY = 'xlrate_state';

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    blocks,
    tasks,
    config: {
      workStart: document.getElementById('work-start').value,
      workEnd:   document.getElementById('work-end').value,
      bufferPct: document.getElementById('buffer-pct').value,
    },
  }));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const { blocks: b, tasks: t, config: c } = JSON.parse(raw);
    if (b) { blocks = b; }
    if (t) { tasks  = t; }
    if (c) {
      if (c.workStart) document.getElementById('work-start').value = c.workStart;
      if (c.workEnd)   document.getElementById('work-end').value   = c.workEnd;
      if (c.bufferPct !== undefined) document.getElementById('buffer-pct').value = c.bufferPct;
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// ── Render helpers ─────────────────────────────────────────────────────────────
function renderBlocks() {
  const list = document.getElementById('blocks-list');
  if (blocks.length === 0) {
    list.innerHTML = '<li class="empty">No blocks added yet.</li>';
    return;
  }
  list.innerHTML = blocks.map((b, i) => `
    <li>
      <span class="item-label">${esc(b.name)}</span>
      <span class="item-detail">${b.start} – ${b.end}</span>
      <button class="btn-remove" data-type="block" data-index="${i}" title="Remove">✕</button>
    </li>
  `).join('');
}

function renderTasks() {
  const list = document.getElementById('tasks-list');
  if (tasks.length === 0) {
    list.innerHTML = '<li class="empty">No tasks added yet.</li>';
    return;
  }
  list.innerHTML = tasks.map((t, i) => {
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

// ── Add block ──────────────────────────────────────────────────────────────────
function addBlock() {
  const name  = document.getElementById('block-name').value.trim();
  const start = document.getElementById('block-start').value;
  const end   = document.getElementById('block-end').value;

  if (!name)        return showError('block-name',  'Block name is required.');
  if (!start || !end) return alert('Please set start and end times.');
  if (start >= end) return alert('Start time must be before end time.');

  blocks.push({ name, start, end });
  renderBlocks();
  saveState();
  document.getElementById('block-name').value = '';
}

// ── Add task ───────────────────────────────────────────────────────────────────
function addTask() {
  const name        = document.getElementById('task-name').value.trim();
  const durationRaw = document.getElementById('task-duration').value;
  const priority    = parseInt(document.getElementById('task-priority').value);
  const deadline    = document.getElementById('task-deadline').value  || undefined;
  const energy      = document.getElementById('task-energy').value    || undefined;

  if (!name)        return showError('task-name',     'Task name is required.');
  if (!durationRaw) return showError('task-duration', 'Duration is required.');

  const durationMins = parseInt(durationRaw);
  if (durationMins <= 0) return showError('task-duration', 'Duration must be positive.');

  tasks.push({ name, durationMins, priority, deadline, energy });
  renderTasks();
  saveState();
  document.getElementById('task-name').value     = '';
  document.getElementById('task-duration').value = '';
  document.getElementById('task-deadline').value = '';
  document.getElementById('task-energy').value   = '';
}

// ── Remove items (event delegation) ───────────────────────────────────────────
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn-remove');
  if (!btn) return;
  const index = parseInt(btn.dataset.index);
  if (btn.dataset.type === 'block') {
    blocks.splice(index, 1);
    renderBlocks();
  } else {
    tasks.splice(index, 1);
    renderTasks();
  }
  saveState();
});

// ── Generate ───────────────────────────────────────────────────────────────────
function generate() {
  const date      = document.getElementById('plan-date').value;
  const workStart = document.getElementById('work-start').value;
  const workEnd   = document.getElementById('work-end').value;
  const bufferPct = parseInt(document.getElementById('buffer-pct').value);

  if (!date)               return alert('Please select a date.');
  if (!workStart || !workEnd) return alert('Please set work start and end times.');
  if (workStart >= workEnd)   return alert('Work start must be before work end.');
  if (tasks.length === 0)     return alert('Add at least one task to schedule.');

  const config = { workStart, workEnd, bufferPct };

  try {
    const result = generatePlan(date, config, blocks, tasks);
    renderOutput(result);
  } catch (err) {
    alert('Error generating plan: ' + err.message);
  }
}

// ── Render output ──────────────────────────────────────────────────────────────
function renderOutput({ windows, schedule, spillover, meta }) {
  const section = document.getElementById('output');
  section.classList.remove('hidden');

  // Windows
  document.getElementById('out-windows').innerHTML = windows.length === 0
    ? '<p class="empty">No free windows — all time is blocked.</p>'
    : windows.map(w => `
        <div class="window-item">
          <span class="time">${w.start} – ${w.end}</span>
          <span class="duration">${w.durationMins}m free</span>
        </div>
      `).join('');

  // Schedule
  document.getElementById('out-schedule').innerHTML = schedule.length === 0
    ? '<p class="empty">Nothing could be scheduled.</p>'
    : schedule.map(e => `
        <div class="schedule-item">
          <span class="time">${e.start} – ${e.end}</span>
          <span class="task-name">${esc(e.task)}</span>
          <span class="duration">${e.durationMins}m</span>
        </div>
      `).join('');

  // Spillover
  document.getElementById('out-spillover').innerHTML = spillover.length === 0
    ? '<p class="empty">All tasks fit — nothing spilled over.</p>'
    : spillover.map(t => `
        <div class="spillover-item">
          <span class="task-name">${esc(t.name)}</span>
          <span class="duration">${t.durationMins}m · P${t.priority ?? '–'}</span>
        </div>
      `).join('');

  // Meta
  const used    = meta.scheduledMins;
  const cap     = meta.schedulableMins;
  const total   = meta.totalAvailableMins;
  const pct     = cap > 0 ? Math.round((used / cap) * 100) : 0;
  document.getElementById('out-meta').textContent =
    `Scheduled: ${used}m of ${cap}m capacity (${pct}% used) · Total free time: ${total}m`;

  section.scrollIntoView({ behavior: 'smooth' });
}

// ── Demo data ──────────────────────────────────────────────────────────────────
function loadDemo() {
  document.getElementById('plan-date').value  = today();
  document.getElementById('work-start').value = '08:00';
  document.getElementById('work-end').value   = '22:00';
  document.getElementById('buffer-pct').value = '20';

  blocks = [
    { name: 'Math Class',   start: '09:00', end: '10:30' },
    { name: 'Lunch',        start: '12:00', end: '13:00' },
    { name: 'Gym',          start: '17:00', end: '18:00' },
    { name: 'Sleep',        start: '23:00', end: '08:00' },
  ];
  renderBlocks();
  saveState();

  tasks = [
    { name: 'Problem set 3',         durationMins: 120, priority: 5, deadline: today(),     energy: 'high'   },
    { name: 'Write essay draft',     durationMins:  90, priority: 4, deadline: tomorrow(),  energy: 'high'   },
    { name: 'Read chapter 7',        durationMins:  45, priority: 3,                        energy: 'medium' },
    { name: 'Email professor',       durationMins:  15, priority: 3,                        energy: 'low'    },
    { name: 'Review lecture notes',  durationMins:  30, priority: 2,                        energy: 'low'    },
    { name: 'Research project outline', durationMins: 60, priority: 3,                      energy: 'medium' },
    { name: 'Practice problems',     durationMins:  75, priority: 2,                        energy: 'medium' },
  ];
  renderTasks();
  saveState();
}

// ── Utilities ──────────────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().split('T')[0];
}
function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}
function esc(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function showError(inputId, msg) {
  const el = document.getElementById(inputId);
  el.style.borderColor = 'var(--danger)';
  el.focus();
  setTimeout(() => el.style.borderColor = '', 2000);
  alert(msg);
}

// ── Wire up buttons ────────────────────────────────────────────────────────────
document.getElementById('add-block-btn').addEventListener('click', addBlock);
document.getElementById('add-task-btn').addEventListener('click', addTask);
document.getElementById('generate-btn').addEventListener('click', generate);
document.getElementById('demo-btn').addEventListener('click', loadDemo);

// Enter key shortcuts
document.getElementById('block-name').addEventListener('keydown', e => { if (e.key === 'Enter') addBlock(); });
document.getElementById('task-name').addEventListener('keydown',  e => { if (e.key === 'Enter') addTask();  });

// Save config whenever it changes
['work-start', 'work-end', 'buffer-pct'].forEach(id => {
  document.getElementById(id).addEventListener('change', saveState);
});

// ── Init ───────────────────────────────────────────────────────────────────────
document.getElementById('plan-date').value = today();
loadState();
renderBlocks();
renderTasks();
