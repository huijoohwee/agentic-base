export class BaseOperationError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = 'BaseOperationError';
    this.code = code;
    if (details !== undefined) this.details = details;
  }

  toJSON() {
    return { code: this.code, message: this.message, ...(this.details ? { details: this.details } : {}) };
  }
}

export function fail(code, message, details) {
  throw new BaseOperationError(code, message, details);
}

export function assert(condition, code, message, details) {
  if (!condition) fail(code, message, details);
}

export function cloneJson(value) {
  try {
    return structuredClone(value);
  } catch {
    fail('INVALID_JSON', 'The value must contain only cloneable JSON data');
  }
}

export function jsonBytes(value) {
  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    fail('INVALID_JSON', 'The value must contain only finite, acyclic JSON data');
  }
  assert(typeof serialized === 'string', 'INVALID_JSON', 'The value is not serializable JSON');
  return new TextEncoder().encode(serialized).byteLength;
}

export function publicError(error) {
  if (error instanceof BaseOperationError) return error.toJSON();
  if (error?.name === 'QuotaExceededError') {
    return { code: 'STORAGE_QUOTA', message: 'The browser storage quota was reached' };
  }
  return { code: 'STORAGE_FAILURE', message: 'The storage operation failed' };
}
