import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeWindows } from '../core/windowCalc.js';

const base = { workStart: '08:00', workEnd: '17:00', bufferPct: 0 };

test('computeWindows: no blocks — single window spanning full work day', () => {
  const { windows, totalAvailableMins, schedulableMins } = computeWindows(base, []);
  assert.equal(windows.length, 1);
  assert.equal(windows[0].start, 480);
  assert.equal(windows[0].end, 1020);
  assert.equal(totalAvailableMins, 540);
  assert.equal(schedulableMins, 540);
});

test('computeWindows: one block in the middle produces two windows', () => {
  const { windows, totalAvailableMins } = computeWindows(base, [
    { name: 'Meeting', start: '10:00', end: '11:00' },
  ]);
  assert.equal(windows.length, 2);
  assert.equal(windows[0].start, 480);
  assert.equal(windows[0].end, 600);
  assert.equal(windows[1].start, 660);
  assert.equal(windows[1].end, 1020);
  assert.equal(totalAvailableMins, 480);
});

test('computeWindows: two blocks produce three windows', () => {
  const { windows, totalAvailableMins } = computeWindows(base, [
    { name: 'Meeting A', start: '09:00', end: '10:00' },
    { name: 'Lunch',     start: '12:00', end: '13:00' },
  ]);
  assert.equal(windows.length, 3);
  assert.equal(totalAvailableMins, 420);
});

test('computeWindows: block at start of day', () => {
  const { windows } = computeWindows(base, [
    { name: 'Early class', start: '08:00', end: '09:30' },
  ]);
  assert.equal(windows.length, 1);
  assert.equal(windows[0].start, 570);
});

test('computeWindows: block at end of day', () => {
  const { windows } = computeWindows(base, [
    { name: 'Late meeting', start: '16:00', end: '17:00' },
  ]);
  assert.equal(windows.length, 1);
  assert.equal(windows[0].end, 960);
});

test('computeWindows: 20% buffer reduces schedulable time', () => {
  const config = { ...base, bufferPct: 20 };
  const { totalAvailableMins, schedulableMins } = computeWindows(config, []);
  assert.equal(totalAvailableMins, 540);
  assert.equal(schedulableMins, 432); // 540 * 0.8
});

test('computeWindows: 0% buffer — schedulable equals total available', () => {
  const { totalAvailableMins, schedulableMins } = computeWindows(base, []);
  assert.equal(schedulableMins, totalAvailableMins);
});

test('computeWindows: block that covers entire work day yields no windows', () => {
  const { windows, totalAvailableMins } = computeWindows(base, [
    { name: 'All day event', start: '08:00', end: '17:00' },
  ]);
  assert.equal(windows.length, 0);
  assert.equal(totalAvailableMins, 0);
});
