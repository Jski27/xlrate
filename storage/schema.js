/**
 * storage/schema.js
 * Versioned storage schema for persisted plans.
 *
 * Increment PLAN_SCHEMA_VERSION whenever the StoredPlan shape changes in a
 * backwards-incompatible way. Readers must reject (or migrate) any stored
 * object whose schemaVersion does not match.
 *
 * All times inside a StoredPlan follow domain conventions:
 *   - Dates:  YYYY-MM-DD strings
 *   - Times:  minutes-from-midnight integers (0–1440)
 *   - IDs:    UUID v4 strings
 */

/** @type {1} */
export const PLAN_SCHEMA_VERSION = 1;

/**
 * The exact shape written to and read from any persistence layer (localStorage,
 * file, API, etc.). schemaVersion is always present so readers can gate on it
 * before attempting to deserialise the rest of the object.
 *
 * @typedef {import('../domain/index.js').Plan & { schemaVersion: typeof PLAN_SCHEMA_VERSION }} StoredPlan
 */

/**
 * Type guard: returns true when `raw` can be safely treated as a StoredPlan
 * at the current schema version. Returns false if the object is missing,
 * malformed, or from an older/newer schema version that requires migration.
 *
 * @param {unknown} raw - Value parsed from storage (e.g. JSON.parse result)
 * @returns {raw is StoredPlan}
 */
export function isCompatibleSchema(raw) {
  return (
    raw !== null &&
    typeof raw === 'object' &&
    /** @type {any} */ (raw).schemaVersion === PLAN_SCHEMA_VERSION
  );
}
