/**
 * domain/index.js
 * Canonical domain model for xlrate scheduling.
 *
 * Single source of truth for all data shapes used across engine, UI, and storage.
 * All other modules should reference types from here via JSDoc @import or @typedef.
 *
 * Conventions:
 *   - Dates:  YYYY-MM-DD strings
 *   - Times:  minutes-from-midnight integers (0–1440)
 *   - IDs:    UUID v4 strings
 *   - All persisted entities include schemaVersion
 */

// ── Enums (exported as const objects for runtime use) ─────────────────────────

/** @enum {string} */
export const EnergyLevel = /** @type {const} */ ({
  HIGH:   'high',
  MEDIUM: 'medium',
  LOW:    'low',
});

/** @enum {string} */
export const Recurrence = /** @type {const} */ ({
  NONE:    'none',
  DAILY:   'daily',
  WEEKLY:  'weekly',
});

/** @enum {string} */
export const CarryoverPolicy = /** @type {const} */ ({
  ALWAYS_CARRY:        'always-carry',
  DROP_AFTER_DEADLINE: 'drop-after-deadline',
  STRICT_DEADLINE:     'strict-deadline',
});

/** @enum {string} */
export const EnergyCurve = /** @type {const} */ ({
  MORNING_HIGH: 'morning-high',
  MIDDAY_HIGH:  'midday-high',
  EVENING_HIGH: 'evening-high',
  FLAT:         'flat',
});

// ── Task ──────────────────────────────────────────────────────────────────────

/**
 * A unit of schedulable work.
 *
 * @typedef {Object} Task
 * @property {string}      id              - UUID v4
 * @property {string}      name            - Human-readable label
 * @property {number}      durationMinutes - Duration in minutes (positive integer)
 * @property {number}      priority        - Scheduling urgency: 1 (low) to 5 (high)
 * @property {'high'|'medium'|'low'} energyLevel - Cognitive demand level
 * @property {string|null} deadline        - Due date as YYYY-MM-DD, or null
 * @property {string}      createdAt       - ISO 8601 timestamp
 * @property {string}      updatedAt       - ISO 8601 timestamp
 */

// ── NonNegotiable ─────────────────────────────────────────────────────────────

/**
 * A fixed time block that cannot be moved (class, meeting, appointment, etc.).
 *
 * @typedef {Object} NonNegotiable
 * @property {string}   id           - UUID v4
 * @property {string}   name         - Human-readable label
 * @property {number}   startMinutes - Start time in minutes from midnight (0–1440)
 * @property {number}   endMinutes   - End time in minutes from midnight (0–1440)
 * @property {'none'|'daily'|'weekly'} recurrence - How often this block repeats
 * @property {number[]} [daysOfWeek] - Days of week (0=Sun … 6=Sat); used when recurrence is 'weekly'
 * @property {string}   [startDate]  - Effective start date (YYYY-MM-DD); optional
 * @property {string}   [endDate]    - Effective end date (YYYY-MM-DD); optional
 */

// ── PlanConfig ────────────────────────────────────────────────────────────────

/**
 * Configuration that controls how the scheduler generates a plan.
 *
 * @typedef {Object} PlanConfig
 * @property {string}  timezone         - IANA timezone string (e.g. 'America/Chicago')
 * @property {string}  workStart        - Work day start time as HH:MM
 * @property {string}  workEnd          - Work day end time as HH:MM
 * @property {number}  bufferPct        - Percentage of available time kept as unscheduled buffer (0–100)
 * @property {boolean} allowSplits      - Whether tasks may be split across windows
 * @property {number}  minSplitMinutes  - Minimum fragment size when splits are enabled
 * @property {'always-carry'|'drop-after-deadline'|'strict-deadline'} carryoverPolicy - Behaviour for tasks that don't fit today
 * @property {'morning-high'|'midday-high'|'evening-high'|'flat'}    energyCurve     - Shape of the user's energy throughout the day
 */

// ── ScheduledBlock ────────────────────────────────────────────────────────────

/**
 * A task that has been placed into a specific time window by the scheduler.
 *
 * @typedef {Object} ScheduledBlock
 * @property {string}  taskId          - References Task.id
 * @property {string}  taskName        - Denormalized for display (avoids joins at render time)
 * @property {number}  startMinutes    - Scheduled start in minutes from midnight
 * @property {number}  endMinutes      - Scheduled end in minutes from midnight
 * @property {number}  durationMinutes - Actual scheduled duration (may differ from task if split)
 * @property {boolean} isSplit         - True if this is one fragment of a split task
 */

// ── DaySchedule ───────────────────────────────────────────────────────────────

/**
 * The complete scheduling output for a single calendar day.
 *
 * @typedef {Object} DaySchedule
 * @property {string}          date     - Plan date (YYYY-MM-DD)
 * @property {ScheduledBlock[]} blocks  - Tasks placed into time windows
 * @property {Task[]}          spillover - Tasks that could not be scheduled this day
 * @property {{ start: number, end: number, durationMinutes: number }[]} windows - Free windows used during scheduling
 * @property {{ totalAvailableMinutes: number, schedulableMinutes: number, scheduledMinutes: number }} meta - Capacity summary
 */

// ── PlanRun ───────────────────────────────────────────────────────────────────

/**
 * A single execution of the scheduler over the plan's date range.
 * Multiple runs accumulate in Plan.runs, allowing history and comparison.
 *
 * @typedef {Object} PlanRun
 * @property {string}        id          - UUID v4
 * @property {string}        generatedAt - ISO 8601 timestamp of when the run was produced
 * @property {string}        startDate   - First day in this run (YYYY-MM-DD)
 * @property {string}        endDate     - Last day in this run (YYYY-MM-DD)
 * @property {DaySchedule[]} days        - One DaySchedule per day in [startDate, endDate]
 */

// ── Plan ──────────────────────────────────────────────────────────────────────

/**
 * Top-level container for a user's scheduling plan.
 * This is the unit of persistence — everything the user has configured plus run history.
 *
 * @typedef {Object} Plan
 * @property {string}           id             - UUID v4
 * @property {string}           name           - User-facing plan name
 * @property {{ startDate: string, endDate: string }} dateRange - Covered date range
 * @property {Task[]}           tasks          - All tasks in the plan
 * @property {NonNegotiable[]}  nonNegotiables - All fixed time blocks
 * @property {PlanConfig}       config         - Scheduler configuration
 * @property {PlanRun[]}        runs           - History of scheduler executions
 * @property {number}           schemaVersion  - Must match PLAN_SCHEMA_VERSION from storage/schema.js
 * @property {string}           createdAt      - ISO 8601 timestamp
 * @property {string}           updatedAt      - ISO 8601 timestamp
 */
