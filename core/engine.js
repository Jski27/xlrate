/**
 * engine.js
 * Public API for the scheduling engine.
 * The UI (or any caller) should only ever import from this file.
 */

import { computeWindows } from './windowCalc.js';
import { sortTasks, scheduleTasks } from './scheduler.js';
import { toHHMM } from './timeUtils.js';

/**
 * Generate a full day plan.
 *
 * @param {string} date - ISO date string (YYYY-MM-DD) for the plan day
 * @param {{ workStart: string, workEnd: string, bufferPct: number }} config
 * @param {{ name: string, start: string, end: string }[]} blocks
 * @param {{ name: string, durationMins: number, priority?: number, deadline?: string, energy?: string }[]} tasks
 *
 * @returns {{
 *   windows: { start: string, end: string, durationMins: number }[],
 *   schedule: { start: string, end: string, task: string, durationMins: number }[],
 *   spillover: object[],
 *   meta: { totalAvailableMins: number, schedulableMins: number, scheduledMins: number }
 * }}
 */
export function generatePlan(date, config, blocks, tasks) {
  const { windows, totalAvailableMins, schedulableMins } = computeWindows(config, blocks);

  const sorted = sortTasks(tasks, date);
  const { schedule, spillover } = scheduleTasks(windows, sorted, schedulableMins);

  return {
    windows: windows.map(w => ({
      start: toHHMM(w.start),
      end: toHHMM(w.end),
      durationMins: w.end - w.start,
    })),
    schedule,
    spillover,
    meta: {
      totalAvailableMins,
      schedulableMins,
      scheduledMins: schedule.reduce((sum, e) => sum + e.durationMins, 0),
    },
  };
}
