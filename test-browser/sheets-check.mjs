import { CONTRACT, calculate, encodeSnapshot, decodeSnapshot, sampleCells } from '/agentic-sheets/core.mjs';
import { createSheetsStore } from '/agentic-sheets/storage.mjs';
export async function runSheetsBrowserChecks() {
  const name = `agentic-sheets-contract-${crypto.randomUUID()}`, results = [];
  const assert = (condition, label) => { if (!condition) throw new Error(label); results.push(label); };
  let count = 0;
  const command = (operation, revision, payload, operationId = `op_${++count}`) => ({ contract: CONTRACT, operationId, operation, expectedRevision: revision, payload });
  const a = createSheetsStore({ name, authorize: () => true }), b = createSheetsStore({ name, authorize: () => true });
  const edit = (book, value, id) => command('setCells', book.revision, { workbookId: book.workbookId, sheetId: book.sheetId, changes: [{ address: 'B2', cell: { type: 'number', value } }] }, id);
  let first;
  try {
    let opens = 0;
    const denied = createSheetsStore({ name, authorize: () => false, indexedDB: { open() { opens++; } } });
    await denied.load().then(() => { throw new Error('Expected denial'); }, error => assert(error.code === 'FORBIDDEN' && opens === 0, 'authorization-before-database'));
    first = await a.commit(command('create', 0, { workbookId: 'browser_book', sheetId: 'browser_sheet', name: 'Browser fixture', cells: sampleCells() }));
    assert(calculate(first.workbook).D4.value === 80, 'initial-total-80');
    const attempts = await Promise.allSettled([a.commit(edit(first.workbook, 4)), b.commit(edit(first.workbook, 6))]);
    assert(attempts.filter(value => value.status === 'fulfilled').length === 1 && attempts.filter(value => value.reason?.code === 'CONFLICT').length === 1, 'indexeddb-concurrent-writers-one-winner');
    let book = await a.load(); const accepted = encodeSnapshot(book);
    assert(book.revision === 2 && calculate(book).D4.value === 130, 'accepted-readback-130');
    await a.close(); book = await a.load();
    assert(encodeSnapshot(book) === accepted, 'database-close-reopen-preserves-bytes');
    const operation = edit(book, 5, 'replayed_write');
    const written = await a.commit(operation), replay = await b.commit(operation);
    assert(replay.replayed && JSON.stringify(replay.receipt) === JSON.stringify(written.receipt), 'durable-operation-replay');
    const signal = new AbortController(); signal.abort();
    await a.commit(edit(written.workbook, 7), { signal: signal.signal }).then(() => { throw new Error('Expected abort'); }, error => assert(error.code === 'CANCELLED', 'cancel-before-write'));
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.transaction.db.name === name) throw new DOMException('Injected quota exhaustion', 'QuotaExceededError');
      return originalPut.apply(this, args);
    };
    try { await a.commit(edit(written.workbook, 8)).then(() => { throw new Error('Expected quota error'); }, error => assert(error.code === 'QUOTA', 'quota-failure-is-explicit')); }
    finally { IDBObjectStore.prototype.put = originalPut; }
    assert(encodeSnapshot(await a.load()) === encodeSnapshot(written.workbook), 'quota-and-cancel-preserve-accepted-bytes');
    const imported = decodeSnapshot(encodeSnapshot(first.workbook));
    const restored = await a.commit(command('restore', written.workbook.revision, { workbookId: written.workbook.workbookId, snapshot: imported, mode: 'replace' }));
    assert(restored.workbook.revision === written.workbook.revision + 1 && calculate(restored.workbook).D4.value === 80, 'snapshot-restore-advances-live-revision');
    const timings = []; book = restored.workbook;
    for (let i = 0; i < 100; i++) { const start = performance.now(); book = (await a.commit(edit(book, i))).workbook; timings.push(performance.now() - start); }
    timings.sort((left, right) => left - right);
    const p95 = timings[94]; assert(p95 <= 100, '100-edits-p95-under-100ms-on-recorded-browser');
    return { passed: results, p95Milliseconds: p95, userAgent: navigator.userAgent, scope: 'real IndexedDB, injected quota, independent browser fixture; not mobile hardware or production proof' };
  } finally {
    await a.close(); await b.close();
    await new Promise((resolve, reject) => { const request = indexedDB.deleteDatabase(name); request.onsuccess = resolve; request.onerror = () => reject(request.error); });
  }
}
