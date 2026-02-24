import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMins, toHHMM, subtractIntervals } from '../core/timeUtils.js';

// --- toMins ---

test('toMins: midnight', () => assert.equal(toMins('00:00'), 0));
test('toMins: 08:00', () => assert.equal(toMins('08:00'), 480));
test('toMins: 09:30', () => assert.equal(toMins('09:30'), 570));
test('toMins: 23:59', () => assert.equal(toMins('23:59'), 1439));

// --- toHHMM ---

test('toHHMM: 0', () => assert.equal(toHHMM(0), '00:00'));
test('toHHMM: 480', () => assert.equal(toHHMM(480), '08:00'));
test('toHHMM: 570', () => assert.equal(toHHMM(570), '09:30'));
test('toHHMM: 1439', () => assert.equal(toHHMM(1439), '23:59'));
test('toHHMM: pads single-digit hour and minute', () => assert.equal(toHHMM(65), '01:05'));

// --- subtractIntervals ---

test('subtractIntervals: no blockers returns base interval', () => {
  const result = subtractIntervals({ start: 480, end: 600 }, []);
  assert.deepEqual(result, [{ start: 480, end: 600 }]);
});

test('subtractIntervals: blocker has no overlap (after)', () => {
  const result = subtractIntervals({ start: 480, end: 600 }, [{ start: 600, end: 660 }]);
  assert.deepEqual(result, [{ start: 480, end: 600 }]);
});

test('subtractIntervals: blocker has no overlap (before)', () => {
  const result = subtractIntervals({ start: 480, end: 600 }, [{ start: 400, end: 480 }]);
  assert.deepEqual(result, [{ start: 480, end: 600 }]);
});

test('subtractIntervals: blocker covers entire slot', () => {
  const result = subtractIntervals({ start: 540, end: 600 }, [{ start: 480, end: 720 }]);
  assert.deepEqual(result, []);
});

test('subtractIntervals: blocker at the start', () => {
  const result = subtractIntervals({ start: 480, end: 720 }, [{ start: 480, end: 540 }]);
  assert.deepEqual(result, [{ start: 540, end: 720 }]);
});

test('subtractIntervals: blocker at the end', () => {
  const result = subtractIntervals({ start: 480, end: 720 }, [{ start: 660, end: 720 }]);
  assert.deepEqual(result, [{ start: 480, end: 660 }]);
});

test('subtractIntervals: blocker in the middle splits slot', () => {
  const result = subtractIntervals({ start: 480, end: 720 }, [{ start: 540, end: 600 }]);
  assert.deepEqual(result, [{ start: 480, end: 540 }, { start: 600, end: 720 }]);
});

test('subtractIntervals: multiple blockers', () => {
  const result = subtractIntervals(
    { start: 480, end: 840 },
    [{ start: 540, end: 600 }, { start: 660, end: 720 }]
  );
  assert.deepEqual(result, [
    { start: 480, end: 540 },
    { start: 600, end: 660 },
    { start: 720, end: 840 },
  ]);
});

test('subtractIntervals: unsorted blockers are handled correctly', () => {
  const result = subtractIntervals(
    { start: 480, end: 840 },
    [{ start: 660, end: 720 }, { start: 540, end: 600 }]
  );
  assert.deepEqual(result, [
    { start: 480, end: 540 },
    { start: 600, end: 660 },
    { start: 720, end: 840 },
  ]);
});
