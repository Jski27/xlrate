/**
 * storage/migrations.js
 * Migration pipeline for StoredPlan objects.
 *
 * Each migration upgrades a plan from `fromVersion` to `fromVersion + 1`.
 * Migrations run in sequence until the plan reaches PLAN_SCHEMA_VERSION.
 *
 * To add a new migration when bumping PLAN_SCHEMA_VERSION from N to N+1:
 *   1. Increment PLAN_SCHEMA_VERSION in schema.js.
 *   2. Push a new entry: { fromVersion: N, migrate: (plan) => ({ ...plan, <changes> }) }
 */

import { PLAN_SCHEMA_VERSION } from './schema.js';

/**
 * Ordered migration steps. Each entry upgrades schemaVersion N → N+1.
 * @type {Array<{ fromVersion: number, migrate: (plan: any) => any }>}
 */
const MIGRATIONS = [
  // v1 → v2 (stub — no structural changes yet; add fields here when v2 is defined)
  // { fromVersion: 1, migrate: (plan) => ({ ...plan, newField: defaultValue }) },
];

/**
 * Run a raw stored object through the migration pipeline until it reaches
 * PLAN_SCHEMA_VERSION. Returns the (possibly transformed) plan.
 *
 * Throws a TypeError when the input is clearly not a stored plan.
 * Throws an Error when a required migration step is missing.
 *
 * @param {unknown} stored - Value parsed from storage (e.g. result of JSON.parse)
 * @returns {import('./schema.js').StoredPlan}
 */
export function migratePlan(stored) {
  if (stored === null || typeof stored !== 'object') {
    throw new TypeError(
      `migratePlan: expected object, got ${stored === null ? 'null' : typeof stored}`,
    );
  }

  let plan = /** @type {any} */ (stored);

  if (typeof plan.schemaVersion !== 'number') {
    throw new TypeError('migratePlan: missing or invalid schemaVersion');
  }

  if (plan.schemaVersion > PLAN_SCHEMA_VERSION) {
    throw new Error(
      `migratePlan: plan schemaVersion (${plan.schemaVersion}) is newer than app (${PLAN_SCHEMA_VERSION}) — upgrade the app`,
    );
  }

  while (plan.schemaVersion < PLAN_SCHEMA_VERSION) {
    const step = MIGRATIONS.find((m) => m.fromVersion === plan.schemaVersion);
    if (!step) {
      throw new Error(
        `migratePlan: no migration registered from v${plan.schemaVersion}`,
      );
    }
    plan = { ...step.migrate(plan), schemaVersion: plan.schemaVersion + 1 };
  }

  return plan;
}
