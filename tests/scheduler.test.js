import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortTasks, scheduleTasks } from '../core/scheduler.js';

const TODAY = '2026-02-24';

// --- sortTasks ---

test('sortTasks: earlier deadline comes first', () => {
  const tasks = [
    { name: 'B', durationMins: 30, priority: 3, deadline: '2026-02-28' },
    { name: 'A', durationMins: 30, priority: 3, deadline: '2026-02-25' },
  ];
  const sorted = sortTasks(tasks, TODAY);
  assert.equal(sorted[0].name, 'A');
  assert.equal(sorted[1].name, 'B');
});

test('sortTasks: tasks without deadline come after tasks with deadline', () => {
  const tasks = [
    { name: 'No deadline', durationMins: 30, priority: 5 },
    { name: 'Has deadline', durationMins: 30, priority: 1, deadline: '2026-03-01' },
  ];
  const sorted = sortTasks(tasks, TODAY);
  assert.equal(sorted[0].name, 'Has deadline');
  assert.equal(sorted[1].name, 'No deadline');
});

test('sortTasks: higher priority comes first (no deadline)', () => {
  const tasks = [
    { name: 'Low',  durationMins: 30, priority: 2 },
    { name: 'High', durationMins: 30, priority: 5 },
  ];
  const sorted = sortTasks(tasks, TODAY);
  assert.equal(sorted[0].name, 'High');
});

test('sortTasks: high energy sorts before low energy (same priority, no deadline)', () => {
  const tasks = [
    { name: 'Low energy',  durationMins: 30, priority: 3, energy: 'low'  },
    { name: 'High energy', durationMins: 30, priority: 3, energy: 'high' },
  ];
  const sorted = sortTasks(tasks, TODAY);
  assert.equal(sorted[0].name, 'High energy');
});

test('sortTasks: same deadline + same priority → shorter duration first', () => {
  const tasks = [
    { name: 'Long',  durationMins: 90, priority: 3, deadline: '2026-02-27' },
    { name: 'Short', durationMins: 30, priority: 3, deadline: '2026-02-27' },
  ];
  const sorted = sortTasks(tasks, TODAY);
  assert.equal(sorted[0].name, 'Short');
});

test('sortTasks: does not mutate the original array', () => {
  const tasks = [
    { name: 'B', durationMins: 30, priority: 2 },
    { name: 'A', durationMins: 30, priority: 5 },
  ];
  const original = [...tasks];
  sortTasks(tasks, TODAY);
  assert.equal(tasks[0].name, original[0].name);
});

// --- scheduleTasks ---

test('scheduleTasks: places two tasks sequentially in one window', () => {
  const windows = [{ start: 480, end: 720 }]; // 08:00–12:00 = 240 mins
  const tasks = [
    { name: 'Task A', durationMins: 60 },
    { name: 'Task B', durationMins: 90 },
  ];
  const { schedule, spillover } = scheduleTasks(windows, tasks, 240);
  assert.equal(schedule.length, 2);
  assert.equal(spillover.length, 0);
  assert.equal(schedule[0].start, '08:00');
  assert.equal(schedule[0].end, '09:00');
  assert.equal(schedule[1].start, '09:00');
  assert.equal(schedule[1].end, '10:30');
});

test('scheduleTasks: task moves to next window when current window is too small', () => {
  const windows = [
    { start: 480, end: 510 }, // 30 mins
    { start: 600, end: 720 }, // 120 mins
  ];
  const tasks = [{ name: 'Big Task', durationMins: 60 }];
  const { schedule, spillover } = scheduleTasks(windows, tasks, 120);
  assert.equal(schedule.length, 1);
  assert.equal(schedule[0].start, '10:00');
  assert.equal(spillover.length, 0);
});

test('scheduleTasks: spillover when buffer cap is reached', () => {
  const windows = [{ start: 480, end: 720 }]; // 240 mins available
  const tasks = [
    { name: 'Task A', durationMins: 60 },
    { name: 'Task B', durationMins: 60 },
  ];
  // Cap at 90 mins — Task B won't fit
  const { schedule, spillover } = scheduleTasks(windows, tasks, 90);
  assert.equal(schedule.length, 1);
  assert.equal(schedule[0].task, 'Task A');
  assert.equal(spillover.length, 1);
  assert.equal(spillover[0].name, 'Task B');
});

test('scheduleTasks: task too large for any window goes to spillover', () => {
  const windows = [{ start: 480, end: 510 }]; // 30 mins only
  const tasks = [{ name: 'Big Task', durationMins: 60 }];
  const { schedule, spillover } = scheduleTasks(windows, tasks, 60);
  assert.equal(schedule.length, 0);
  assert.equal(spillover.length, 1);
  assert.equal(spillover[0].name, 'Big Task');
});

test('scheduleTasks: no windows → all tasks spill over', () => {
  const tasks = [
    { name: 'Task A', durationMins: 30 },
    { name: 'Task B', durationMins: 45 },
  ];
  const { schedule, spillover } = scheduleTasks([], tasks, 0);
  assert.equal(schedule.length, 0);
  assert.equal(spillover.length, 2);
});

test('scheduleTasks: no tasks → empty schedule and spillover', () => {
  const windows = [{ start: 480, end: 720 }];
  const { schedule, spillover } = scheduleTasks(windows, [], 240);
  assert.equal(schedule.length, 0);
  assert.equal(spillover.length, 0);
});

test('scheduleTasks: task exactly fills window remainder', () => {
  const windows = [{ start: 480, end: 540 }]; // exactly 60 mins
  const tasks = [{ name: 'Perfect Fit', durationMins: 60 }];
  const { schedule, spillover } = scheduleTasks(windows, tasks, 60);
  assert.equal(schedule.length, 1);
  assert.equal(schedule[0].end, '09:00');
  assert.equal(spillover.length, 0);
});
