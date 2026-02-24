/**
 * output.js
 * Renders the full-day calendar view (blocks + scheduled tasks) plus spillover and meta.
 */

import { esc } from './utils.js';

const PX_PER_MIN = 1.2; // 72px per hour

function toMins(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function renderOutput({ schedule, spillover, meta }, blocks, config) {
  const section = document.getElementById('output');
  section.classList.remove('hidden');

  const dayStart   = toMins(config.workStart);
  const dayEnd     = toMins(config.workEnd);
  const totalMins  = dayEnd - dayStart;
  const totalHeight = Math.round(totalMins * PX_PER_MIN);

  // ── Hour lines ────────────────────────────────────────────────────────────
  let hoursHTML = '';
  const firstHour = Math.ceil(dayStart / 60);
  const lastHour  = Math.floor(dayEnd   / 60);
  for (let h = firstHour; h <= lastHour; h++) {
    const top = Math.round((h * 60 - dayStart) * PX_PER_MIN);
    const label = `${String(h).padStart(2, '0')}:00`;
    hoursHTML += `<div class="cal-hour-line" style="top:${top}px"><span class="cal-hour-label">${label}</span></div>`;
  }

  // ── Non-negotiable blocks ─────────────────────────────────────────────────
  let eventsHTML = '';
  for (const b of blocks) {
    const startMins = toMins(b.start);
    const endMins   = toMins(b.end);
    const top    = Math.round((startMins - dayStart) * PX_PER_MIN);
    const height = Math.max(Math.round((endMins - startMins) * PX_PER_MIN), 28);
    const durMins = endMins - startMins;
    eventsHTML += `
      <div class="cal-event cal-event--block" style="top:${top}px;height:${height}px" title="${esc(b.name)} · ${b.start}–${b.end}">
        <span class="cal-event-name">${esc(b.name)}</span>
        <span class="cal-event-time">${b.start} – ${b.end} · ${durMins}m</span>
      </div>`;
  }

  // ── Scheduled tasks ───────────────────────────────────────────────────────
  for (const e of schedule) {
    const startMins = toMins(e.start);
    const endMins   = toMins(e.end);
    const top    = Math.round((startMins - dayStart) * PX_PER_MIN);
    const height = Math.max(Math.round((endMins - startMins) * PX_PER_MIN), 28);
    eventsHTML += `
      <div class="cal-event cal-event--task" style="top:${top}px;height:${height}px" title="${esc(e.task)} · ${e.start}–${e.end}">
        <span class="cal-event-name">${esc(e.task)}</span>
        <span class="cal-event-time">${e.start} – ${e.end} · ${e.durationMins}m</span>
      </div>`;
  }

  document.getElementById('out-calendar').innerHTML = `
    <div class="cal-wrap">
      <div class="cal-inner" style="height:${totalHeight}px">
        ${hoursHTML}
        ${eventsHTML}
      </div>
    </div>`;

  // ── Spillover ─────────────────────────────────────────────────────────────
  document.getElementById('out-spillover').innerHTML = spillover.length === 0
    ? '<p class="empty">All tasks fit — nothing spilled over.</p>'
    : spillover.map(t => `
        <div class="spillover-item">
          <span class="task-name">${esc(t.name)}</span>
          <span class="duration">${t.durationMins}m · P${t.priority ?? '–'}</span>
        </div>
      `).join('');

  // ── Meta bar ──────────────────────────────────────────────────────────────
  const used = meta.scheduledMins;
  const cap  = meta.schedulableMins;
  const pct  = cap > 0 ? Math.round((used / cap) * 100) : 0;
  document.getElementById('out-meta').textContent =
    `Scheduled: ${used}m of ${cap}m capacity (${pct}% used) · Total free time: ${meta.totalAvailableMins}m`;

  section.scrollIntoView({ behavior: 'smooth' });
}
