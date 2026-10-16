import { IndexedDBAdapter } from '../src/adapters/indexeddb.mjs';

const result = document.getElementById('result');
const databaseName = `agentic_base_atomicity_${crypto.randomUUID()}`;
const baseId = 'atomicity_base';
const emptyChanges = () => ({ putTables: [], deleteTableIds: [], putRecords: [], deleteRecordIds: [] });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function deleteDatabase(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Temporary database deletion was blocked'));
  });
}

const adapter = new IndexedDBAdapter({ databaseName });
let report;
try {
  const first = { base: { id: baseId, revision: 1 }, tables: [], records: [] };
  await adapter.commit(baseId, { expectedRevision: 0, snapshot: first, changes: emptyChanges() });
  let rejected = false;
  try {
    const next = { ...first, base: { ...first.base, revision: 2 }, records: [{ id: 'bad_record' }] };
    await adapter.commit(baseId, { expectedRevision: 1, snapshot: next, changes: {
      ...emptyChanges(), putRecords: [{ id: 'bad_record', values: { invalid: () => null } }],
    } });
  } catch (error) {
    rejected = error.code === 'STORAGE_FAILURE';
  }
  const persisted = await adapter.load(baseId);
  assert(rejected, 'The injected uncloneable record did not fail as a storage error');
  assert(persisted.base.revision === 1, 'The base revision advanced despite the aborted transaction');
  assert(persisted.records.length === 0, 'A partial record write survived the aborted transaction');
  report = 'PASS · failed IndexedDB write was rejected; committed revision and records remained unchanged.';
} catch (error) {
  report = `FAIL · ${error.message}`;
} finally {
  await adapter.close();
  await deleteDatabase(databaseName);
}

result.textContent = report;
result.dataset.status = report.startsWith('PASS') ? 'passed' : 'failed';
