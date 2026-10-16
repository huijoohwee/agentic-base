import { BaseOperationError, assert, cloneJson, jsonBytes } from './errors.mjs';
import { selectRecords } from './query.mjs';
import { projectView } from './projectors.mjs';
import {
  CONTRACT_VERSION, DEFAULT_LIMITS, lowerLimits, plainObject, validateFields,
  validateId, validateName, validateRequest, validateValues,
} from './schema.mjs';

const EMPTY_CHANGES = () => ({ putTables: [], deleteTableIds: [], putRecords: [], deleteRecordIds: [] });
const nowIso = () => new Date().toISOString();

function defaultIdFactory(kind) {
  const cryptoApi = globalThis.crypto;
  assert(typeof cryptoApi?.randomUUID === 'function', 'UNSUPPORTED_ENVIRONMENT', 'A secure UUID generator is required');
  return `${kind}_${cryptoApi.randomUUID()}`;
}

function expectedRevision(value, label = 'expectedRevision') {
  assert(Number.isSafeInteger(value) && value >= 1, 'INVALID_REVISION', `${label} must be a positive integer`);
  return value;
}

function allowedKeys(payload, allowed, required = []) {
  assert(Object.keys(payload).every(key => allowed.includes(key)), 'INVALID_REQUEST', 'Payload contains an unsupported property');
  for (const key of required) assert(Object.hasOwn(payload, key), 'INVALID_REQUEST', `Missing payload property: ${key}`);
}

function baseRevision(snapshot, expected) {
  expectedRevision(expected);
  assert(snapshot.base.revision === expected, 'CONFLICT', 'The base revision changed; reload before writing', {
    expectedRevision: expected, actualRevision: snapshot.base.revision,
  });
}

function nextBase(snapshot, now, recordCount = snapshot.base.recordCount, serializedBytes = snapshot.base.serializedBytes) {
  return { ...snapshot.base, revision: snapshot.base.revision + 1, updatedAt: now, recordCount, serializedBytes };
}

function tableFor(snapshot, tableId) {
  const table = snapshot.tables.find(item => item.id === tableId);
  assert(table, 'NOT_FOUND', 'The table does not exist');
  return table;
}

function recordFor(snapshot, tableId, recordId) {
  const record = snapshot.records.find(item => item.id === recordId && item.tableId === tableId);
  assert(record, 'NOT_FOUND', 'The record does not exist');
  return record;
}

function readResult(data, limits) {
  assert(jsonBytes(data) <= limits.maxOperationBytes, 'LIMIT_EXCEEDED', 'Result exceeds the operation byte limit');
  return { ok: true, contractVersion: CONTRACT_VERSION, data: cloneJson(data) };
}

function createRecord(id, baseId, tableId, values, revision, timestamp) {
  return { id, baseId, tableId, revision, values, createdAt: timestamp, updatedAt: timestamp };
}

export function createBaseEngine({ adapter, authorize, idFactory = defaultIdFactory, now = nowIso, limits = {} } = {}) {
  assert(adapter && typeof adapter.load === 'function' && typeof adapter.commit === 'function',
    'INVALID_ADAPTER', 'A storage adapter must implement load and commit');
  assert(typeof authorize === 'function', 'AUTHORIZATION_REQUIRED', 'An explicit authorization callback is required');
  assert(typeof idFactory === 'function' && typeof now === 'function', 'INVALID_ENGINE', 'idFactory and now must be functions');
  const bounded = lowerLimits(limits);

  async function authorizeRequest(request, operation, baseId, tableId = null, recordId = null) {
    let allowed;
    try {
      allowed = await authorize({ actorId: request.actorId, operation, baseId, tableId, recordId });
    } catch {
      throw new BaseOperationError('AUTHORIZATION_FAILURE', 'The authorization check failed');
    }
    assert(allowed === true, 'FORBIDDEN', 'The caller is not authorized for this operation');
  }

  async function loadOwned(request, operation, baseId, tableId = null, recordId = null) {
    validateId(baseId, 'base ID');
    if (tableId !== null) validateId(tableId, 'table ID');
    if (recordId !== null) validateId(recordId, 'record ID');
    await authorizeRequest(request, operation, baseId, tableId, recordId);
    const snapshot = await adapter.load(baseId);
    assert(snapshot?.base, 'NOT_FOUND', 'The base does not exist');
    return snapshot;
  }

  async function write(baseId, expected, next, changes, extra = {}) {
    try {
      await adapter.commit(baseId, { expectedRevision: expected, snapshot: next, changes });
    } catch (error) {
      if (error instanceof BaseOperationError) throw error;
      throw new BaseOperationError('STORAGE_FAILURE', 'The storage adapter rejected the write');
    }
    return readResult({ ...next.base, ...extra }, bounded);
  }

  async function executeRaw(request) {
    const { operation, payload } = request;
    if (operation === 'base.create') {
      allowedKeys(payload, ['id', 'name'], ['name']);
      const baseId = validateId(payload.id ?? idFactory('base'), 'base ID');
      const name = validateName(payload.name, 'base name');
      await authorizeRequest(request, operation, baseId);
      const timestamp = now();
      const base = { id: baseId, name, contractVersion: CONTRACT_VERSION, schemaVersion: 1,
        revision: 1, recordCount: 0, serializedBytes: 2, createdAt: timestamp, updatedAt: timestamp };
      const snapshot = { base, tables: [], records: [] };
      return write(baseId, 0, snapshot, EMPTY_CHANGES());
    }

    if (operation === 'base.get') {
      allowedKeys(payload, ['baseId'], ['baseId']);
      const snapshot = await loadOwned(request, operation, payload.baseId);
      return readResult(snapshot.base, bounded);
    }

    if (operation === 'table.list') {
      allowedKeys(payload, ['baseId'], ['baseId']);
      const snapshot = await loadOwned(request, operation, payload.baseId);
      return readResult([...snapshot.tables].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0), bounded);
    }

    if (operation === 'table.create') {
      allowedKeys(payload, ['baseId', 'expectedRevision', 'id', 'name', 'fields'], ['baseId', 'expectedRevision', 'name', 'fields']);
      const snapshot = await loadOwned(request, operation, payload.baseId);
      baseRevision(snapshot, payload.expectedRevision);
      assert(snapshot.tables.length < bounded.maxTablesPerBase, 'LIMIT_EXCEEDED', 'The base table limit was reached');
      const tableId = validateId(payload.id ?? idFactory('table'), 'table ID');
      assert(!snapshot.tables.some(table => table.id === tableId), 'CONFLICT', 'The table ID already exists');
      const table = { id: tableId, baseId: snapshot.base.id, name: validateName(payload.name, 'table name'),
        fields: validateFields(payload.fields, bounded), revision: 1, createdAt: now(), updatedAt: now() };
      const next = { ...snapshot, base: nextBase(snapshot, now()) };
      next.tables = [...snapshot.tables, table];
      const changes = EMPTY_CHANGES();
      changes.putTables.push(table);
      return write(snapshot.base.id, payload.expectedRevision, next, changes, { table });
    }

    if (operation === 'table.rename') {
      allowedKeys(payload, ['baseId', 'tableId', 'expectedRevision', 'name'], ['baseId', 'tableId', 'expectedRevision', 'name']);
      const snapshot = await loadOwned(request, operation, payload.baseId, payload.tableId);
      baseRevision(snapshot, payload.expectedRevision);
      const prior = tableFor(snapshot, payload.tableId);
      const table = { ...prior, name: validateName(payload.name, 'table name'), revision: prior.revision + 1, updatedAt: now() };
      const next = { ...snapshot, base: nextBase(snapshot, now()), tables: snapshot.tables.map(item => item.id === table.id ? table : item) };
      const changes = EMPTY_CHANGES();
      changes.putTables.push(table);
      return write(snapshot.base.id, payload.expectedRevision, next, changes, { table });
    }

    if (operation === 'record.get') {
      allowedKeys(payload, ['baseId', 'tableId', 'recordId'], ['baseId', 'tableId', 'recordId']);
      const snapshot = await loadOwned(request, operation, payload.baseId, payload.tableId, payload.recordId);
      tableFor(snapshot, payload.tableId);
      return readResult(recordFor(snapshot, payload.tableId, payload.recordId), bounded);
    }

    if (operation === 'record.list') {
      allowedKeys(payload, ['baseId', 'tableId', 'filter', 'sort', 'limit', 'offset'], ['baseId', 'tableId']);
      const snapshot = await loadOwned(request, operation, payload.baseId, payload.tableId);
      const table = tableFor(snapshot, payload.tableId);
      const query = { filter: payload.filter, sort: payload.sort, limit: payload.limit, offset: payload.offset };
      return readResult({ ...selectRecords(snapshot.records, table, query, bounded), revision: snapshot.base.revision }, bounded);
    }

    if (operation === 'record.create') {
      allowedKeys(payload, ['baseId', 'tableId', 'expectedRevision', 'id', 'values'], ['baseId', 'tableId', 'expectedRevision', 'values']);
      const snapshot = await loadOwned(request, operation, payload.baseId, payload.tableId);
      baseRevision(snapshot, payload.expectedRevision);
      const table = tableFor(snapshot, payload.tableId);
      assert(snapshot.records.length < bounded.maxRecordsPerBase, 'LIMIT_EXCEEDED', 'The base record limit was reached');
      const recordId = validateId(payload.id ?? idFactory('record'), 'record ID');
      assert(!snapshot.records.some(record => record.id === recordId), 'CONFLICT', 'The record ID already exists');
      const values = validateValues(table.fields, payload.values);
      const timestamp = now();
      const record = createRecord(recordId, snapshot.base.id, table.id, values, 1, timestamp);
      const records = [...snapshot.records, record];
      const bytes = jsonBytes(records);
      assert(bytes <= bounded.maxSerializedBytesPerBase, 'LIMIT_EXCEEDED', 'The base data-size limit was reached');
      const next = { ...snapshot, base: nextBase(snapshot, timestamp, records.length, bytes), records };
      const changes = EMPTY_CHANGES();
      changes.putRecords.push(record);
      return write(snapshot.base.id, payload.expectedRevision, next, changes, { record });
    }

    if (operation === 'record.update') {
      allowedKeys(payload, ['baseId', 'tableId', 'recordId', 'expectedRevision', 'expectedRecordRevision', 'values'],
        ['baseId', 'tableId', 'recordId', 'expectedRevision', 'expectedRecordRevision', 'values']);
      const snapshot = await loadOwned(request, operation, payload.baseId, payload.tableId, payload.recordId);
      baseRevision(snapshot, payload.expectedRevision);
      const table = tableFor(snapshot, payload.tableId);
      const prior = recordFor(snapshot, table.id, payload.recordId);
      expectedRevision(payload.expectedRecordRevision, 'expectedRecordRevision');
      assert(prior.revision === payload.expectedRecordRevision, 'CONFLICT', 'The record revision changed; reload before writing', {
        expectedRevision: payload.expectedRecordRevision, actualRevision: prior.revision,
      });
      const timestamp = now();
      const record = { ...prior, values: validateValues(table.fields, payload.values), revision: prior.revision + 1, updatedAt: timestamp };
      const records = snapshot.records.map(item => item.id === record.id ? record : item);
      const bytes = jsonBytes(records);
      assert(bytes <= bounded.maxSerializedBytesPerBase, 'LIMIT_EXCEEDED', 'The base data-size limit was reached');
      const next = { ...snapshot, base: nextBase(snapshot, timestamp, records.length, bytes), records };
      const changes = EMPTY_CHANGES();
      changes.putRecords.push(record);
      return write(snapshot.base.id, payload.expectedRevision, next, changes, { record });
    }

    if (operation === 'record.delete') {
      allowedKeys(payload, ['baseId', 'tableId', 'recordId', 'expectedRevision', 'expectedRecordRevision'],
        ['baseId', 'tableId', 'recordId', 'expectedRevision', 'expectedRecordRevision']);
      const snapshot = await loadOwned(request, operation, payload.baseId, payload.tableId, payload.recordId);
      baseRevision(snapshot, payload.expectedRevision);
      const prior = recordFor(snapshot, payload.tableId, payload.recordId);
      expectedRevision(payload.expectedRecordRevision, 'expectedRecordRevision');
      assert(prior.revision === payload.expectedRecordRevision, 'CONFLICT', 'The record revision changed; reload before deleting');
      const records = snapshot.records.filter(item => item.id !== prior.id);
      const bytes = jsonBytes(records);
      const timestamp = now();
      const next = { ...snapshot, base: nextBase(snapshot, timestamp, records.length, bytes), records };
      const changes = EMPTY_CHANGES();
      changes.deleteRecordIds.push(prior.id);
      return write(snapshot.base.id, payload.expectedRevision, next, changes, { deletedRecordId: prior.id });
    }

    if (operation === 'view.project') {
      allowedKeys(payload, ['baseId', 'tableId', 'view', 'query'], ['baseId', 'tableId', 'view']);
      const snapshot = await loadOwned(request, operation, payload.baseId, payload.tableId);
      const table = tableFor(snapshot, payload.tableId);
      const selected = selectRecords(snapshot.records, table, payload.query ?? {}, bounded);
      return readResult({ revision: snapshot.base.revision, total: selected.total,
        projection: projectView({ table, records: selected.items, view: payload.view }) }, bounded);
    }

    throw new BaseOperationError('UNSUPPORTED_OPERATION', `Unsupported operation: ${String(operation)}`);
  }

  return Object.freeze({
    contractVersion: CONTRACT_VERSION,
    limits: bounded,
    async execute(input) {
      try {
        const request = validateRequest(input, bounded);
        return await executeRaw(request);
      } catch (error) {
        const safe = error instanceof BaseOperationError
          ? error.toJSON()
          : error?.name === 'QuotaExceededError'
            ? { code: 'STORAGE_QUOTA', message: 'The browser storage quota was reached' }
            : { code: 'INTERNAL', message: 'The operation could not be completed' };
        return { ok: false, contractVersion: CONTRACT_VERSION, error: safe };
      }
    },
  });
}
