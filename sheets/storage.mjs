import { applyPrepared, prepareCommand, validateWorkbook, SheetsError } from './core.mjs';
import { requireValue } from './schema.mjs';
const abortError = () => new SheetsError('CANCELLED', 'Operation cancelled; read the accepted revision before retrying');
function storageError(error) {
  if (error instanceof SheetsError) return error;
  return new SheetsError(error?.name === 'QuotaExceededError' ? 'QUOTA' : error?.name === 'VersionError' ? 'VERSION' : 'STORAGE', 'Local storage failed; the last accepted workbook is retained');
}
export function createSheetsStore({ indexedDB = globalThis.indexedDB, name = 'agentic-sheets-v1', authorize } = {}) {
  requireValue(indexedDB && typeof authorize === 'function', 'AUTHORIZATION', 'Storage and an explicit host policy are required');
  let database;
  function open() {
    if (database) return database;
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      let blocked = false;
      request.onupgradeneeded = () => request.result.createObjectStore('workbooks');
      request.onblocked = () => { blocked = true; database = null; reject(new SheetsError('BLOCKED', 'Close other tabs before upgrading local storage')); };
      request.onerror = () => { database = null; reject(storageError(request.error)); };
      request.onsuccess = () => {
        const db = request.result;
        if (blocked) { db.close(); return; }
        db.onversionchange = () => { db.close(); database = null; };
        resolve(db);
      };
    });
    return database;
  }
  async function permitted(operation) {
    let allowed = false;
    try { allowed = await authorize({ operation }); } catch { throw new SheetsError('AUTHORIZATION', 'Host policy check failed'); }
    requireValue(allowed === true, 'FORBIDDEN', 'Host policy rejected this operation');
  }
  async function load() {
    await permitted('read');
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('workbooks', 'readonly'), request = tx.objectStore('workbooks').get('current');
      let workbook;
      request.onsuccess = () => { try { workbook = request.result ? validateWorkbook(request.result) : null; } catch (error) { tx.abort(); reject(error); } };
      tx.oncomplete = () => resolve(workbook);
      tx.onerror = tx.onabort = () => reject(storageError(tx.error));
    });
  }
  async function commit(command, { signal } = {}) {
    if (signal?.aborted) throw abortError();
    const prepared = await prepareCommand(command);
    await permitted('write');
    if (signal?.aborted) throw abortError();
    const db = await open();
    if (signal?.aborted) throw abortError();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('workbooks', 'readwrite'), store = tx.objectStore('workbooks');
      let outcome, failure;
      const cancel = () => { failure = abortError(); try { tx.abort(); } catch { /* A completed transaction is reconciled by readback. */ } };
      signal?.addEventListener('abort', cancel, { once: true });
      store.get('current').onsuccess = event => {
        try {
          if (signal?.aborted) throw abortError();
          outcome = applyPrepared(event.target.result ?? null, prepared);
          if (!outcome.replayed) store.put(outcome.workbook, 'current');
        } catch (error) { failure = error; tx.abort(); }
      };
      const cleanup = () => signal?.removeEventListener('abort', cancel);
      tx.oncomplete = () => { cleanup(); resolve(outcome); };
      tx.onerror = tx.onabort = () => { cleanup(); reject(storageError(failure ?? tx.error)); };
    });
  }
  async function close() { if (database) (await database).close(); database = null; }
  return { load, commit, close };
}
