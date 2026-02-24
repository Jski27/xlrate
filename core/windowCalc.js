/**
 * windowCalc.js
 * Computes available scheduling windows by subtracting non-negotiable
 * blocks from the configured work day, then applies the buffer reduction.
 */

import { toMins, subtractIntervals } from './timeUtils.js';

/**
 * @param {{ workStart: string, workEnd: string, bufferPct: number }} config
 * @param {{ name: string, start: string, end: string }[]} blocks
 * @returns {{
 *   windows: { start: number, end: number }[],
 *   totalAvailableMins: number,
 *   schedulableMins: number
 * }}
 */
export function computeWindows(config, blocks) {
  const workInterval = {
    start: toMins(config.workStart),
    end: toMins(config.workEnd),
  };

  const blockIntervals = blocks.map(b => ({
    start: toMins(b.start),
    end: toMins(b.end),
  }));

  const windows = subtractIntervals(workInterval, blockIntervals);

  const totalAvailableMins = windows.reduce(
    (sum, w) => sum + (w.end - w.start),
    0
  );

  const schedulableMins = Math.floor(
    totalAvailableMins * (1 - config.bufferPct / 100)
  );

  return { windows, totalAvailableMins, schedulableMins };
}
