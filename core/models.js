/**
 * models.js
 * Lightweight validators for engine-layer input shapes.
 * Validators return an array of error strings (empty = valid).
 *
 * Canonical type definitions live in /domain/index.js.
 * The engine currently uses abbreviated field names (e.g. durationMins) that
 * pre-date the domain model; alignment is tracked separately.
 *
 * @see {import('../domain/index.js').PlanConfig} for the canonical config shape
 * @see {import('../domain/index.js').NonNegotiable} for the canonical block shape
 * @see {import('../domain/index.js').Task} for the canonical task shape
 */

export function validateConfig(config) {
  const errors = [];
  if (!config.workStart) errors.push('workStart required');
  if (!config.workEnd) errors.push('workEnd required');
  if (config.bufferPct === undefined || config.bufferPct === null) errors.push('bufferPct required');
  if (typeof config.bufferPct === 'number' && (config.bufferPct < 0 || config.bufferPct > 100))
    errors.push('bufferPct must be between 0 and 100');
  return errors;
}

export function validateBlock(block) {
  const errors = [];
  if (!block.name) errors.push('block.name required');
  if (!block.start) errors.push('block.start required');
  if (!block.end) errors.push('block.end required');
  return errors;
}

export function validateTask(task) {
  const errors = [];
  if (!task.name) errors.push('task.name required');
  if (!task.durationMins || task.durationMins <= 0)
    errors.push('task.durationMins must be a positive number');
  if (task.priority !== undefined && (task.priority < 1 || task.priority > 5))
    errors.push('task.priority must be between 1 and 5');
  return errors;
}
