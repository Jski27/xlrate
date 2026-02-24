/**
 * timeUtils.js
 * Parsing, formatting, and interval arithmetic.
 * All times are represented internally as minutes since midnight (integer).
 */

/** "HH:MM" → minutes since midnight */
export function toMins(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

/** minutes since midnight → "HH:MM" */
export function toHHMM(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Subtract an array of blocker intervals from a base interval.
 *
 * @param {{ start: number, end: number }} base - The interval to subtract from.
 * @param {{ start: number, end: number }[]} blockers - Intervals to remove.
 * @returns {{ start: number, end: number }[]} Remaining free intervals.
 */
export function subtractIntervals(base, blockers) {
  const sorted = [...blockers].sort((a, b) => a.start - b.start);
  let free = [{ start: base.start, end: base.end }];

  for (const blocker of sorted) {
    const next = [];
    for (const slot of free) {
      // No overlap — keep slot as-is
      if (blocker.end <= slot.start || blocker.start >= slot.end) {
        next.push(slot);
        continue;
      }
      // Blocker completely covers the slot — discard it
      if (blocker.start <= slot.start && blocker.end >= slot.end) {
        continue;
      }
      // Blocker cuts into the left side — keep right remainder
      if (blocker.start <= slot.start && blocker.end < slot.end) {
        next.push({ start: blocker.end, end: slot.end });
        continue;
      }
      // Blocker cuts into the right side — keep left remainder
      if (blocker.start > slot.start && blocker.end >= slot.end) {
        next.push({ start: slot.start, end: blocker.start });
        continue;
      }
      // Blocker is in the middle — split into two
      next.push({ start: slot.start, end: blocker.start });
      next.push({ start: blocker.end, end: slot.end });
    }
    free = next;
  }

  return free;
}
