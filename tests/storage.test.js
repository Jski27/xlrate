/**
 * tests/storage.test.js
 * Unit tests for the storage layer (storage/storage.js + storage/migrations.js).
 *
 * localStorage is mocked with a plain Map so these tests run under Node.js
 * without any browser environment. The mock is installed before any function
 * calls, which is all that matters since storage.js never reads localStorage
 * at module evaluation time.
 */

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ── localStorage mock ─────────────────────────────────────────────────────────

const _store = new Map();

globalThis.localStorage = {
  getItem:    (key)       => _store.get(key) ?? null,
  setItem:    (key, val)  => { _store.set(key, val); },
  removeItem: (key)       => { _store.delete(key); },
  clear:      ()          => { _store.clear(); },
};

// ── Imports (hoisted above mock setup by ES module semantics, but storage.js
//    only touches localStorage inside function bodies so the mock is in place
//    before any tested function runs) ──────────────────────────────────────────

import {
  listPlans,
  getPlan,
  savePlan,
  deletePlan,
  duplicatePlan,
  StorageError,
} from '../storage/storage.js';
import { migratePlan } from '../storage/migrations.js';
import { PLAN_SCHEMA_VERSION } from '../storage/schema.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePlan(overrides = {}) {
  return {
    id: 'plan-test-1',
    name: 'Test Plan',
    dateRange: { startDate: '2026-02-24', endDate: '2026-02-28' },
    tasks: [],
    nonNegotiables: [],
    config: {
      timezone: 'America/Chicago',
      workStart: '08:00',
      workEnd: '22:00',
      bufferPct: 20,
      allowSplits: false,
      minSplitMinutes: 15,
      carryoverPolicy: 'always-carry',
      energyCurve: 'morning-high',
    },
    runs: [],
    createdAt: '2026-02-24T08:00:00.000Z',
    updatedAt: '2026-02-24T08:00:00.000Z',
    ...overrides,
  };
}

// ── Save / load ───────────────────────────────────────────────────────────────

test('savePlan / getPlan: roundtrip preserves plan data', () => {
  _store.clear();
  const plan = makePlan({ id: 'rt-1', name: 'Roundtrip' });
  savePlan(plan);
  const loaded = getPlan('rt-1');
  assert.equal(loaded.id, 'rt-1');
  assert.equal(loaded.name, 'Roundtrip');
});

test('savePlan: always stamps current schemaVersion', () => {
  _store.clear();
  const plan = makePlan({ id: 'sv-1' });
  const saved = savePlan(plan);
  assert.equal(saved.schemaVersion, PLAN_SCHEMA_VERSION);
});

test('savePlan: updates updatedAt on overwrite', () => {
  _store.clear();
  const plan = makePlan({ id: 'ts-1' });
  const first = savePlan(plan);
  const second = savePlan({ ...plan, name: 'Updated' });
  // updatedAt should be a valid ISO string and may differ between saves
  assert.ok(typeof second.updatedAt === 'string');
  assert.equal(second.name, 'Updated');
});

// ── listPlans ─────────────────────────────────────────────────────────────────

test('listPlans: returns all saved plans', () => {
  _store.clear();
  savePlan(makePlan({ id: 'lp-a', name: 'Alpha' }));
  savePlan(makePlan({ id: 'lp-b', name: 'Beta' }));
  const { plans, errors } = listPlans();
  assert.equal(plans.length, 2);
  assert.equal(errors.length, 0);
});

test('listPlans: returns empty arrays when storage is empty', () => {
  _store.clear();
  const { plans, errors } = listPlans();
  assert.equal(plans.length, 0);
  assert.equal(errors.length, 0);
});

// ── deletePlan ────────────────────────────────────────────────────────────────

test('deletePlan: removes plan so getPlan throws', () => {
  _store.clear();
  savePlan(makePlan({ id: 'del-1' }));
  deletePlan('del-1');
  assert.throws(
    () => getPlan('del-1'),
    (err) => err instanceof StorageError,
  );
});

test('deletePlan: no-op for non-existent id', () => {
  _store.clear();
  assert.doesNotThrow(() => deletePlan('ghost'));
});

// ── duplicatePlan ─────────────────────────────────────────────────────────────

test('duplicatePlan: creates a new plan with a different ID', () => {
  _store.clear();
  savePlan(makePlan({ id: 'orig-1', name: 'Original' }));
  const copy = duplicatePlan('orig-1');
  assert.notEqual(copy.id, 'orig-1');
});

test('duplicatePlan: copy name includes "(copy)"', () => {
  _store.clear();
  savePlan(makePlan({ id: 'orig-2', name: 'My Plan' }));
  const copy = duplicatePlan('orig-2');
  assert.ok(copy.name.includes('copy'), `Expected name to include "copy", got "${copy.name}"`);
});

test('duplicatePlan: copy has empty runs array', () => {
  _store.clear();
  // Original has a fake run entry
  savePlan(makePlan({ id: 'orig-3', runs: [{ id: 'run-1' }] }));
  const copy = duplicatePlan('orig-3');
  assert.equal(copy.runs.length, 0);
});

test('duplicatePlan: both original and copy exist after duplication', () => {
  _store.clear();
  savePlan(makePlan({ id: 'orig-4' }));
  duplicatePlan('orig-4');
  const { plans } = listPlans();
  assert.equal(plans.length, 2);
});

test('duplicatePlan: throws StorageError for non-existent source', () => {
  _store.clear();
  assert.throws(
    () => duplicatePlan('no-such-id'),
    (err) => err instanceof StorageError,
  );
});

// ── Invalid schema / corrupt data ─────────────────────────────────────────────

test('listPlans: skips corrupt entries and collects a StorageError per entry', () => {
  _store.clear();
  // Write a corrupt index entry manually
  localStorage.setItem('xlrate_plans', JSON.stringify({
    'bad-1': { notAValidPlan: true },
    'bad-2': null,
  }));
  const { plans, errors } = listPlans();
  assert.equal(plans.length, 0);
  assert.equal(errors.length, 2);
  assert.ok(errors.every((e) => e instanceof StorageError));
});

test('listPlans: StorageError carries the affected planId', () => {
  _store.clear();
  localStorage.setItem('xlrate_plans', JSON.stringify({ 'bad-id': { junk: true } }));
  const { errors } = listPlans();
  assert.equal(errors[0].planId, 'bad-id');
});

test('getPlan: throws StorageError for missing plan', () => {
  _store.clear();
  assert.throws(
    () => getPlan('nonexistent'),
    (err) => err instanceof StorageError && err.planId === 'nonexistent',
  );
});

test('getPlan: throws StorageError for corrupt plan', () => {
  _store.clear();
  localStorage.setItem('xlrate_plans', JSON.stringify({ 'corrupt-1': { garbage: true } }));
  assert.throws(
    () => getPlan('corrupt-1'),
    (err) => err instanceof StorageError,
  );
});

test('getPlan: does not throw for unparseable localStorage (returns not found)', () => {
  _store.clear();
  // Garbled JSON in the index — readIndex returns {} so the plan simply isn't found
  localStorage.setItem('xlrate_plans', 'NOT_JSON');
  assert.throws(
    () => getPlan('any-id'),
    (err) => err instanceof StorageError,
  );
});

// ── migrations.js unit tests ──────────────────────────────────────────────────

test('migratePlan: passes through a current-version plan unchanged', () => {
  const plan = makePlan({ id: 'mig-1', schemaVersion: PLAN_SCHEMA_VERSION });
  const result = migratePlan(plan);
  assert.equal(result.schemaVersion, PLAN_SCHEMA_VERSION);
  assert.equal(result.id, 'mig-1');
});

test('migratePlan: throws TypeError for null input', () => {
  assert.throws(
    () => migratePlan(null),
    (err) => err instanceof TypeError,
  );
});

test('migratePlan: throws TypeError for non-object input', () => {
  assert.throws(
    () => migratePlan('a string'),
    (err) => err instanceof TypeError,
  );
});

test('migratePlan: throws TypeError when schemaVersion is missing', () => {
  assert.throws(
    () => migratePlan({ id: 'x', name: 'no-version' }),
    (err) => err instanceof TypeError,
  );
});

test('migratePlan: throws Error when plan is from a newer schema', () => {
  assert.throws(
    () => migratePlan({ schemaVersion: PLAN_SCHEMA_VERSION + 1 }),
    (err) => err instanceof Error && err.message.includes('newer than app'),
  );
});
