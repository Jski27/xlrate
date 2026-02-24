/**
 * output.js
 * Renders the schedule output section (windows, schedule, spillover, meta).
 * This module will be replaced/extended by ui/calendar.js in v2 phase 6.
 */

import { esc } from './utils.js';

export function renderOutput({ windows, schedule, spillover, meta }) {
  const section = document.getElementById('output');
  section.classList.remove('hidden');

  // Available windows
  document.getElementById('out-windows').innerHTML = windows.length === 0
    ? '<p class="empty">No free windows — all time is blocked.</p>'
    : windows.map(w => `
        <div class="window-item">
          <span class="time">${w.start} – ${w.end}</span>
          <span class="duration">${w.durationMins}m free</span>
        </div>
      `).join('');

  // Proposed schedule
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

  // Meta bar
  const used  = meta.scheduledMins;
  const cap   = meta.schedulableMins;
  const total = meta.totalAvailableMins;
  const pct   = cap > 0 ? Math.round((used / cap) * 100) : 0;
  document.getElementById('out-meta').textContent =
    `Scheduled: ${used}m of ${cap}m capacity (${pct}% used) · Total free time: ${total}m`;

  section.scrollIntoView({ behavior: 'smooth' });
}
