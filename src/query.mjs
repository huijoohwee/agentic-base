import { assert, jsonBytes } from './errors.mjs';
import { plainObject, validateFilter, validateSort } from './schema.mjs';

function compareValue(left, right) {
  if (left === right) return 0;
  if (left === null || left === undefined) return -1;
  if (right === null || right === undefined) return 1;
  if (typeof left === 'number' && typeof right === 'number') return left < right ? -1 : 1;
  if (typeof left === 'boolean' && typeof right === 'boolean') return Number(left) - Number(right);
  const leftText = String(left);
  const rightText = String(right);
  return leftText < rightText ? -1 : 1;
}

function matches(node, values) {
  if (node === null) return true;
  if (node.all) return node.all.every(child => matches(child, values));
  if (node.any) return node.any.some(child => matches(child, values));
  const actual = values[node.fieldId];
  if (node.operator === 'isEmpty') return actual === null || actual === undefined || actual === '';
  if (node.operator === 'contains') return typeof actual === 'string' && actual.includes(node.value);
  switch (node.operator) {
    case 'eq': return actual === node.value;
    case 'ne': return actual !== node.value;
    case 'gt': return actual > node.value;
    case 'gte': return actual >= node.value;
    case 'lt': return actual < node.value;
    case 'lte': return actual <= node.value;
    default: return false;
  }
}

export function selectRecords(records, table, query = {}, limits) {
  plainObject(query, 'query');
  assert(Object.keys(query).every(key => ['filter', 'sort', 'limit', 'offset'].includes(key)),
    'INVALID_QUERY', 'Query contains an unsupported property');
  const filter = validateFilter(query.filter, table.fields, limits);
  const sort = validateSort(query.sort, table.fields, limits);
  const limit = query.limit ?? Math.min(100, limits.maxPageSize);
  const offset = query.offset ?? 0;
  assert(Number.isSafeInteger(limit) && limit > 0 && limit <= limits.maxPageSize,
    'LIMIT_EXCEEDED', `limit must be between 1 and ${limits.maxPageSize}`);
  assert(Number.isSafeInteger(offset) && offset >= 0 && offset <= limits.maxRecordsPerBase,
    'INVALID_QUERY', 'offset is outside the base record limit');
  const ordered = records.filter(record => record.tableId === table.id && matches(filter, record.values));
  ordered.sort((left, right) => {
    for (const key of sort) {
      const compared = compareValue(left.values[key.fieldId] ?? null, right.values[key.fieldId] ?? null);
      if (compared !== 0) return key.direction === 'desc' ? -compared : compared;
    }
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  });
  const total = ordered.length;
  const items = ordered.slice(offset, offset + limit);
  const nextOffset = offset + items.length < total ? offset + items.length : null;
  assert(jsonBytes(items) <= limits.maxOperationBytes, 'LIMIT_EXCEEDED', 'Selected records exceed the output byte limit');
  return { items, total, offset, nextOffset };
}

export { compareValue };
