import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryAdapter } from '../src/adapters/memory.mjs';
import { createBaseEngine } from '../src/engine.mjs';
import { addRecord, harness, seedTable, taskFields } from '../test-support/helpers.mjs';

test('authorization is checked before any store read or write', async () => {
  const memory = new MemoryAdapter();
  let reads = 0;
  let writes = 0;
  const adapter = { load: async id => { reads += 1; return memory.load(id); },
    commit: (...args) => { writes += 1; return memory.commit(...args); } };
  const engine = createBaseEngine({ adapter, authorize: () => false });
  const result = await engine.execute({ contractVersion: 1, actorId: 'guest', operation: 'base.get', payload: { baseId: 'base_x' } });
  assert.equal(result.error.code, 'FORBIDDEN');
  const deniedWrite = await engine.execute({ contractVersion: 1, actorId: 'guest', operation: 'base.create',
    payload: { id: 'base_x', name: 'Denied' } });
  assert.equal(deniedWrite.error.code, 'FORBIDDEN');
  assert.equal(reads, 0);
  assert.equal(writes, 0);
  assert.equal(await memory.load('base_x'), null);
});

test('schema rejection does not mutate the prior revision', async () => {
  const { adapter, run } = harness();
  const base = await run('base.create', { id: 'base_local', name: 'Local Tasks' });
  const invalid = await run('table.create', { baseId: 'base_local', expectedRevision: base.data.revision,
    name: 'Bad table', fields: [taskFields[0], taskFields[0]] });
  assert.equal(invalid.error.code, 'INVALID_SCHEMA');
  const unknown = await run('table.create', { baseId: 'base_local', expectedRevision: base.data.revision,
    name: 'Unknown property', fields: [taskFields[0]], extension: true });
  assert.equal(unknown.error.code, 'INVALID_REQUEST');
  const persisted = await adapter.load('base_local');
  assert.equal(persisted.base.revision, 1);
  assert.equal(persisted.tables.length, 0);
});

test('base, table, and record operations preserve stable IDs and revisions', async () => {
  const { adapter, run } = harness();
  const { revision } = await seedTable(run);
  const created = await addRecord(run, { revision, id: 'record_one', values: { title: 'Ship base', status: 'Todo', points: 3 } });
  assert.equal(created.result.ok, true);
  const read = await run('record.get', { baseId: 'base_local', tableId: 'table_tasks', recordId: 'record_one' });
  assert.equal(read.data.id, 'record_one');
  assert.equal(read.data.revision, 1);

  const updated = await run('record.update', { baseId: 'base_local', tableId: 'table_tasks', recordId: 'record_one',
    expectedRevision: created.revision, expectedRecordRevision: 1,
    values: { title: 'Ship base', status: 'Doing', points: 5 } });
  assert.equal(updated.data.revision, created.revision + 1);
  const deleted = await run('record.delete', { baseId: 'base_local', tableId: 'table_tasks', recordId: 'record_one',
    expectedRevision: updated.data.revision, expectedRecordRevision: 2 });
  assert.equal(deleted.data.recordCount, 0);
  const persisted = await adapter.load('base_local');
  assert.equal(persisted.records.length, 0);
  assert.equal(persisted.tables[0].id, 'table_tasks');
});

test('stale base or record revisions return a conflict and retain the committed snapshot', async () => {
  const { adapter, run } = harness();
  const { revision } = await seedTable(run);
  const first = await addRecord(run, { revision, id: 'record_one', values: { title: 'First', status: 'Todo' } });
  const staleBase = await run('record.create', { baseId: 'base_local', tableId: 'table_tasks', expectedRevision: revision,
    id: 'record_two', values: { title: 'Stale', status: 'Todo' } });
  assert.equal(staleBase.error.code, 'CONFLICT');
  const staleRecord = await run('record.update', { baseId: 'base_local', tableId: 'table_tasks', recordId: 'record_one',
    expectedRevision: first.revision, expectedRecordRevision: 9,
    values: { title: 'Overwritten', status: 'Done' } });
  assert.equal(staleRecord.error.code, 'CONFLICT');
  const persisted = await adapter.load('base_local');
  assert.equal(persisted.records.length, 1);
  assert.equal(persisted.records[0].values.title, 'First');
});

test('concurrent writes with one expected revision commit at most once', async () => {
  const { adapter, run } = harness();
  const { revision } = await seedTable(run);
  const attempts = await Promise.all(['record_a', 'record_b'].map(id => run('record.create', {
    baseId: 'base_local', tableId: 'table_tasks', expectedRevision: revision, id,
    values: { title: id, status: 'Todo' },
  })));
  assert.equal(attempts.filter(result => result.ok).length, 1);
  assert.equal(attempts.filter(result => result.error?.code === 'CONFLICT').length, 1);
  assert.equal((await adapter.load('base_local')).records.length, 1);
});

test('queries are typed, bounded, and returned in stable order', async () => {
  const { run } = harness();
  let { revision } = await seedTable(run);
  for (const [id, title, points] of [['record_b', 'Beta', 2], ['record_a', 'Alpha', 3], ['record_c', 'Gamma', 1]]) {
    ({ revision } = await addRecord(run, { revision, id, values: { title, status: 'Todo', points } }));
  }
  const result = await run('record.list', { baseId: 'base_local', tableId: 'table_tasks',
    filter: { fieldId: 'points', operator: 'gte', value: 2 }, sort: [{ fieldId: 'title', direction: 'asc' }], limit: 1 });
  assert.equal(result.ok, true);
  assert.equal(result.data.total, 2);
  assert.equal(result.data.items[0].id, 'record_a');
  assert.equal(result.data.nextOffset, 1);
  const invalid = await run('record.list', { baseId: 'base_local', tableId: 'table_tasks',
    filter: { fieldId: 'status', operator: 'gt', value: 'Todo' } });
  assert.equal(invalid.error.code, 'INVALID_QUERY');
});

test('invalid contract version and unsupported operations fail with stable errors', async () => {
  const { engine } = harness();
  const wrongVersion = await engine.execute({ contractVersion: 2, actorId: 'alice', operation: 'base.get', payload: { baseId: 'base_x' } });
  assert.equal(wrongVersion.error.code, 'CONTRACT_VERSION');
  const unsupported = await engine.execute({ contractVersion: 1, actorId: 'alice', operation: 'file.sync', payload: {} });
  assert.equal(unsupported.error.code, 'UNSUPPORTED_OPERATION');
});

test('caller limits can be lowered but cannot be raised above product caps', async () => {
  assert.throws(() => createBaseEngine({ adapter: new MemoryAdapter(), authorize: () => true,
    limits: { maxRecordsPerBase: 50_000 } }), error => error.code === 'INVALID_LIMIT');
  const { run } = harness({ limits: { maxRecordsPerBase: 1 } });
  const { revision } = await seedTable(run);
  const first = await addRecord(run, { revision, id: 'record_one', values: { title: 'One', status: 'Todo' } });
  const second = await run('record.create', { baseId: 'base_local', tableId: 'table_tasks', expectedRevision: first.revision,
    id: 'record_two', values: { title: 'Two', status: 'Todo' } });
  assert.equal(second.error.code, 'LIMIT_EXCEEDED');
});
