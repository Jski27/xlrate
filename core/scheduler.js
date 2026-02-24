/**
 * scheduler.js
 * Sorts tasks by urgency/priority/duration, then greedily places them
 * into available windows up to the buffer-adjusted capacity.
 */

import { toHHMM } from './timeUtils.js';

/**
 * Returns days until deadline from the plan date.
 * Tasks without a deadline return Infinity so they sort last.
 */
function deadlineUrgency(task, dateStr) {
  if (!task.deadline) return Infinity;
  // Use noon to avoid timezone edge cases on date-only strings
  const taskDate = new Date(task.deadline + 'T12:00:00');
  const planDate = new Date(dateStr + 'T12:00:00');
  return (taskDate - planDate) / (1000 * 60 * 60 * 24);
}

/**
 * Sort tasks:
 *   1. Deadline urgency (sooner first; no deadline = last)
 *   2. Priority (5 = highest → goes first)
 *   3. Energy (high → medium → low, so high-energy tasks land in earlier windows)
 *   4. Duration (shorter first as tiebreaker)
 *
 * @param {{ name: string, durationMins: number, priority?: number, deadline?: string, energy?: string }[]} tasks
 * @param {string} dateStr - ISO date string for the plan day (YYYY-MM-DD)
 * @returns same array, sorted (does not mutate original)
 */
function energyRank(task) {
  const ranks = { high: 0, medium: 1, low: 2 };
  return ranks[task.energy] ?? 1; // default to medium
}

export function sortTasks(tasks, dateStr) {
  return [...tasks].sort((a, b) => {
    const ua = deadlineUrgency(a, dateStr);
    const ub = deadlineUrgency(b, dateStr);
    if (ua !== ub) return ua - ub;

    const pa = a.priority ?? 1;
    const pb = b.priority ?? 1;
    if (pa !== pb) return pb - pa;

    const ea = energyRank(a);
    const eb = energyRank(b);
    if (ea !== eb) return ea - eb;

    return a.durationMins - b.durationMins;
  });
}

/**
 * Greedy task placement into windows.
 * Tasks are not split. Scheduling stops when schedulableMins is reached.
 * Any task that doesn't fit goes to spillover.
 *
 * @param {{ start: number, end: number }[]} windows - Free windows (minutes since midnight)
 * @param {{ name: string, durationMins: number }[]} tasks - Already sorted
 * @param {number} schedulableMins - Budget cap after buffer
 * @returns {{
 *   schedule: { start: string, end: string, task: string, durationMins: number }[],
 *   spillover: object[]
 * }}
 */
export function scheduleTasks(windows, tasks, schedulableMins) {
  const schedule = [];
  const spillover = [];

  // Mutable cursors tracking how far into each window we've scheduled
  const slots = windows.map(w => ({ start: w.start, end: w.end, cursor: w.start }));

  let minutesScheduled = 0;

  for (const task of tasks) {
    // Buffer cap check
    if (minutesScheduled + task.durationMins > schedulableMins) {
      spillover.push(task);
      continue;
    }

    let placed = false;

    for (const slot of slots) {
      const remaining = slot.end - slot.cursor;
      if (remaining >= task.durationMins) {
        const taskStart = slot.cursor;
        const taskEnd = taskStart + task.durationMins;
        schedule.push({
          start: toHHMM(taskStart),
          end: toHHMM(taskEnd),
          task: task.name,
          durationMins: task.durationMins,
        });
        slot.cursor = taskEnd;
        minutesScheduled += task.durationMins;
        placed = true;
        break;
      }
    }

    if (!placed) {
      spillover.push(task);
    }
  }

  return { schedule, spillover };
}
