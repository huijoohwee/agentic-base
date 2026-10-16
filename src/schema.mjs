import { assert, fail, jsonBytes } from './errors.mjs';

export const CONTRACT_VERSION = 1;
export const DEFAULT_LIMITS = Object.freeze({
  maxRecordsPerBase: 2_000,
  maxSerializedBytesPerBase: 5 * 1024 * 1024,
  maxTablesPerBase: 64,
  maxFieldsPerTable: 128,
  maxFilterNodes: 64,
  maxFilterDepth: 6,
  maxSortKeys: 8,
  maxPageSize: 250,
  maxOperationBytes: 500 * 1024,
});

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/u;
const FIELD_TYPES = new Set(['text', 'number', 'boolean', 'date', 'select']);
const FILTER_OPERATORS = new Set(['eq', 'ne', 'contains', 'gt', 'gte', 'lt', 'lte', 'isEmpty']);
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

export function plainObject(value, label = 'value') {
  assert(value !== null && typeof value === 'object' && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null),
  'INVALID_REQUEST', `${label} must be a plain object`);
  return value;
}

export function validateId(value, label = 'id') {
  assert(typeof value === 'string' && ID_PATTERN.test(value), 'INVALID_ID', `${label} must be a stable opaque ID`);
  return value;
}

export function validateName(value, label = 'name') {
  assert(typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 160,
    'INVALID_SCHEMA', `${label} must contain 1–160 characters`);
  return value.trim();
}

export function validDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function validateField(field, limits = DEFAULT_LIMITS) {
  plainObject(field, 'field');
  const id = validateId(field.id, 'field id');
  const name = validateName(field.name, 'field name');
  assert(FIELD_TYPES.has(field.type), 'INVALID_SCHEMA', `Unsupported field type: ${String(field.type)}`);
  assert(field.required === undefined || typeof field.required === 'boolean', 'INVALID_SCHEMA', 'required must be boolean');
  const result = { id, name, type: field.type, required: field.required === true };
  if (field.type === 'select') {
    assert(Array.isArray(field.options) && field.options.length > 0 && field.options.length <= 64,
      'INVALID_SCHEMA', 'Select fields require 1–64 options');
    const options = field.options.map(option => validateName(option, 'option'));
    assert(new Set(options).size === options.length, 'INVALID_SCHEMA', 'Select options must be unique');
    result.options = options;
  } else {
    assert(field.options === undefined, 'INVALID_SCHEMA', 'Only select fields can define options');
  }
  assert(jsonBytes(result) <= limits.maxOperationBytes, 'LIMIT_EXCEEDED', 'Field definition exceeds the operation limit');
  return result;
}

export function validateFields(fields, limits = DEFAULT_LIMITS) {
  assert(Array.isArray(fields) && fields.length > 0 && fields.length <= limits.maxFieldsPerTable,
    'INVALID_SCHEMA', `A table requires 1–${limits.maxFieldsPerTable} fields`);
  const result = fields.map(field => validateField(field, limits));
  assert(new Set(result.map(field => field.id)).size === result.length, 'INVALID_SCHEMA', 'Field IDs must be unique');
  return result;
}

export function validateFieldValue(field, value) {
  if (value === null || value === undefined || value === '') {
    assert(!field.required, 'INVALID_RECORD', `Field ${field.id} is required`);
    return null;
  }
  switch (field.type) {
    case 'text':
      assert(typeof value === 'string', 'INVALID_RECORD', `Field ${field.id} must be text`);
      return value;
    case 'number':
      assert(typeof value === 'number' && Number.isFinite(value), 'INVALID_RECORD', `Field ${field.id} must be a finite number`);
      return value;
    case 'boolean':
      assert(typeof value === 'boolean', 'INVALID_RECORD', `Field ${field.id} must be boolean`);
      return value;
    case 'date':
      assert(validDateOnly(value), 'INVALID_RECORD', `Field ${field.id} must be a valid ISO date-only value`);
      return value;
    case 'select':
      assert(typeof value === 'string' && field.options.includes(value), 'INVALID_RECORD', `Field ${field.id} must match a select option`);
      return value;
    default:
      fail('INVALID_SCHEMA', `Unsupported field type: ${String(field.type)}`);
  }
}

export function validateValues(fields, values) {
  plainObject(values, 'values');
  const byId = new Map(fields.map(field => [field.id, field]));
  for (const key of Object.keys(values)) assert(byId.has(key), 'INVALID_RECORD', `Unknown field ID: ${key}`);
  const normalized = {};
  for (const field of fields) {
    const value = hasOwn(values, field.id) ? values[field.id] : null;
    const result = validateFieldValue(field, value);
    if (result !== null) normalized[field.id] = result;
  }
  return normalized;
}

function validateFilterNode(node, fields, limits, depth, state) {
  assert(depth <= limits.maxFilterDepth, 'LIMIT_EXCEEDED', 'Filter nesting is too deep');
  state.nodes += 1;
  assert(state.nodes <= limits.maxFilterNodes, 'LIMIT_EXCEEDED', 'Filter contains too many nodes');
  plainObject(node, 'filter node');
  if (hasOwn(node, 'all') || hasOwn(node, 'any')) {
    const key = hasOwn(node, 'all') ? 'all' : 'any';
    assert(Object.keys(node).length === 1 && Array.isArray(node[key]) && node[key].length > 0,
      'INVALID_QUERY', `${key} filter must contain one or more child filters`);
    return { [key]: node[key].map(child => validateFilterNode(child, fields, limits, depth + 1, state)) };
  }
  assert(Object.keys(node).every(key => ['fieldId', 'operator', 'value'].includes(key))
    && Object.keys(node).length >= 2, 'INVALID_QUERY', 'Filter comparison has unsupported properties');
  const fieldId = validateId(node.fieldId, 'filter field ID');
  const field = fields.find(item => item.id === fieldId);
  assert(field, 'INVALID_QUERY', `Unknown filter field: ${fieldId}`);
  assert(FILTER_OPERATORS.has(node.operator), 'INVALID_QUERY', `Unsupported filter operator: ${String(node.operator)}`);
  if (node.operator === 'contains') assert(field.type === 'text', 'INVALID_QUERY', 'contains is only valid for text fields');
  if (['gt', 'gte', 'lt', 'lte'].includes(node.operator)) {
    assert(['number', 'date', 'text'].includes(field.type), 'INVALID_QUERY', 'Ordering requires a number, date, or text field');
  }
  assert(node.operator === 'isEmpty' || hasOwn(node, 'value'), 'INVALID_QUERY', 'Filter comparison requires a value');
  const result = { fieldId, operator: node.operator };
  if (node.operator !== 'isEmpty') result.value = validateFieldValue({ ...field, required: false }, node.value);
  return result;
}

export function validateFilter(filter, fields, limits = DEFAULT_LIMITS) {
  if (filter === undefined || filter === null) return null;
  return validateFilterNode(filter, fields, limits, 1, { nodes: 0 });
}

export function validateSort(sort, fields, limits = DEFAULT_LIMITS) {
  if (sort === undefined) return [];
  assert(Array.isArray(sort) && sort.length <= limits.maxSortKeys, 'LIMIT_EXCEEDED', 'Sort has too many keys');
  const seen = new Set();
  return sort.map(item => {
    plainObject(item, 'sort item');
    const fieldId = validateId(item.fieldId, 'sort field ID');
    assert(fields.some(field => field.id === fieldId), 'INVALID_QUERY', `Unknown sort field: ${fieldId}`);
    assert(item.direction === 'asc' || item.direction === 'desc', 'INVALID_QUERY', 'Sort direction must be asc or desc');
    assert(!seen.has(fieldId), 'INVALID_QUERY', 'Sort fields must be unique');
    seen.add(fieldId);
    return { fieldId, direction: item.direction };
  });
}

export function validateRequest(request, limits = DEFAULT_LIMITS) {
  plainObject(request, 'request');
  assert(jsonBytes(request) <= limits.maxOperationBytes, 'LIMIT_EXCEEDED', 'Request exceeds the operation byte limit');
  assert(request.contractVersion === CONTRACT_VERSION, 'CONTRACT_VERSION', `contractVersion must be ${CONTRACT_VERSION}`);
  const actorId = validateId(request.actorId, 'actor ID');
  assert(typeof request.operation === 'string', 'INVALID_REQUEST', 'operation must be a string');
  const payload = plainObject(request.payload ?? {}, 'payload');
  return { ...request, actorId, payload };
}

export function lowerLimits(custom = {}, baseline = DEFAULT_LIMITS) {
  plainObject(custom, 'limits');
  const limits = { ...baseline };
  for (const [key, value] of Object.entries(custom)) {
    assert(hasOwn(baseline, key), 'INVALID_LIMIT', `Unknown limit: ${key}`);
    assert(Number.isSafeInteger(value) && value > 0 && value <= baseline[key],
      'INVALID_LIMIT', `${key} must be an integer between 1 and ${baseline[key]}`);
    limits[key] = value;
  }
  return Object.freeze(limits);
}
