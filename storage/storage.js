/**
 * storage/storage.js
 * Public API for plan persistence.
 *
 * All reads pass through migratePlan() so callers always receive a
 * current-version StoredPlan regardless of when the data was written.
 * Corrupt or unrecognisable data surfaces as a StorageError rather than
 * crashing the app, so the UI can offer a recoverable "delete corrupt plan"
 * action.
 *
 * Implementation detail: plans are stored in a single localStorage key as a
 * flat id→plan map. Swap `readIndex`/`writeIndex` to change the backend.
 */

import { PLAN_SCHEMA_VERSION } from './schema.js';
import { migratePlan } from './migrations.js';

const PLANS_KEY = 'xlrate_plans';

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Read the raw plans index from localStorage.
 * Returns an empty object when storage is empty or the value cannot be parsed.
 *
 * @returns {Record<string, unknown>}
 */
function readIndex() {
  try {
    const raw = localStorage.getItem(PLANS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

/**
 * Persist the plans index to localStorage.
 *
 * @param {Record<string, unknown>} index
 */
function writeIndex(index) {
  localStorage.setItem(PLANS_KEY, JSON.stringify(index));
}

/**
 * Generate a UUID v4. Uses the Web Crypto API when available (browser + Node 19+),
 * falls back to a Math.random()-based implementation for older Node versions.
 *
 * @returns {string}
 */
function generateId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  // RFC 4122 v4 UUID fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── StorageError ──────────────────────────────────────────────────────────────

/**
 * Recoverable storage error raised when a plan cannot be loaded or saved.
 * Callers can inspect `.planId` to surface a targeted "delete corrupt plan"
 * action to the user without requiring a full storage wipe.
 */
export class StorageError extends Error {
  /**
   * @param {string} message
   * @param {string | null} planId - ID of the affected plan, if known
   */
  constructor(message, planId = null) {
    super(message);
    this.name = 'StorageError';
    this.planId = planId;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return all stored plans after running each through the migration pipeline.
 * Plans that fail migration are excluded from the result; a StorageError is
 * collected per bad entry so the caller can surface deletion controls for them.
 *
 * @returns {{ plans: import('./schema.js').StoredPlan[], errors: StorageError[] }}
 */
export function listPlans() {
  const index = readIndex();
  const plans = [];
  const errors = [];

  for (const [id, raw] of Object.entries(index)) {
    try {
      plans.push(migratePlan(raw));
    } catch (err) {
      errors.push(
        new StorageError(`Plan "${id}" could not be loaded: ${err.message}`, id),
      );
    }
  }

  return { plans, errors };
}

/**
 * Retrieve and migrate a single plan by ID.
 *
 * @param {string} id
 * @returns {import('./schema.js').StoredPlan}
 * @throws {StorageError} if the plan is missing or corrupt
 */
export function getPlan(id) {
  const index = readIndex();

  if (!(id in index)) {
    throw new StorageError(`Plan "${id}" not found`, id);
  }

  try {
    return migratePlan(index[id]);
  } catch (err) {
    throw new StorageError(`Plan "${id}" is corrupt: ${err.message}`, id);
  }
}

/**
 * Persist a plan. Always stamps the current schemaVersion and updatedAt.
 * Creates a new entry if the ID is not yet stored; otherwise overwrites.
 *
 * @param {import('../domain/index.js').Plan & { id: string }} plan
 * @returns {import('./schema.js').StoredPlan} The saved plan as stored
 */
export function savePlan(plan) {
  const stored = {
    ...plan,
    schemaVersion: PLAN_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  };

  const index = readIndex();
  index[plan.id] = stored;
  writeIndex(index);

  return stored;
}

/**
 * Remove a plan by ID. No-op when the ID does not exist.
 *
 * @param {string} id
 */
export function deletePlan(id) {
  const index = readIndex();
  delete index[id];
  writeIndex(index);
}

/**
 * Create an independent copy of a plan under a new UUID.
 * The copy gets an empty runs array and a " (copy)" name suffix.
 *
 * @param {string} id - ID of the plan to duplicate
 * @returns {import('./schema.js').StoredPlan} The newly saved duplicate
 * @throws {StorageError} if the source plan cannot be loaded
 */
export function duplicatePlan(id) {
  const source = getPlan(id); // throws StorageError if missing/corrupt
  const now = new Date().toISOString();

  const copy = {
    ...source,
    id: generateId(),
    name: `${source.name} (copy)`,
    runs: [],
    createdAt: now,
    updatedAt: now,
  };

  return savePlan(copy);
}
