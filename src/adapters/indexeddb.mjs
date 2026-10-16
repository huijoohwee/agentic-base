import { BaseOperationError, fail } from '../errors.mjs';

const DATABASE_VERSION = 1;
const STORE_NAMES = ['bases', 'tables', 'records'];

export class IndexedDBAdapter {
  #databasePromise;

  constructor({ databaseName = 'agentic-base-local-v1', indexedDB = globalThis.indexedDB } = {}) {
    if (!indexedDB) fail('UNSUPPORTED_ENVIRONMENT', 'IndexedDB is required for browser persistence');
    if (typeof databaseName !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/u.test(databaseName)) {
      fail('INVALID_REQUEST', 'databaseName must be a short portable identifier');
    }
    this.databaseName = databaseName;
    this.indexedDB = indexedDB;
  }

  async load(baseId) {
    const database = await this.#open();
    return new Promise((resolve, reject) => {
      let base;
      let tables;
      let records;
      const transaction = database.transaction(STORE_NAMES, 'readonly');
      transaction.objectStore('bases').get(baseId).onsuccess = event => { base = event.target.result; };
      transaction.objectStore('tables').index('byBaseId').getAll(baseId).onsuccess = event => { tables = event.target.result; };
      transaction.objectStore('records').index('byBaseId').getAll(baseId).onsuccess = event => { records = event.target.result; };
      transaction.oncomplete = () => resolve(base ? { base, tables: tables ?? [], records: records ?? [] } : null);
      transaction.onerror = () => reject(this.#storageError(transaction.error));
      transaction.onabort = () => reject(this.#storageError(transaction.error));
    });
  }

  async commit(baseId, { expectedRevision, snapshot, changes }) {
    const database = await this.#open();
    return new Promise((resolve, reject) => {
      let failure = null;
      const transaction = database.transaction(STORE_NAMES, 'readwrite');
      const bases = transaction.objectStore('bases');
      const tables = transaction.objectStore('tables');
      const records = transaction.objectStore('records');
      const currentRequest = bases.get(baseId);
      currentRequest.onerror = () => {
        failure = this.#storageError(currentRequest.error);
        transaction.abort();
      };
      currentRequest.onsuccess = () => {
        const actualRevision = currentRequest.result?.revision ?? 0;
        if (actualRevision !== expectedRevision) {
          failure = new BaseOperationError('CONFLICT', 'The base changed before this write committed', {
            expectedRevision, actualRevision,
          });
          transaction.abort();
          return;
        }
        try {
          bases.put(snapshot.base);
          changes.deleteTableIds.forEach(id => tables.delete(id));
          changes.deleteRecordIds.forEach(id => records.delete(id));
          changes.putTables.forEach(table => tables.put(table));
          changes.putRecords.forEach(record => records.put(record));
        } catch (error) {
          failure = this.#storageError(error);
          transaction.abort();
        }
      };
      transaction.oncomplete = () => resolve(snapshot.base);
      transaction.onerror = () => reject(failure ?? this.#storageError(transaction.error));
      transaction.onabort = () => reject(failure ?? this.#storageError(transaction.error));
    });
  }

  async close() {
    if (!this.#databasePromise) return;
    const database = await this.#databasePromise;
    database.close();
    this.#databasePromise = null;
  }

  #open() {
    if (this.#databasePromise) return this.#databasePromise;
    this.#databasePromise = new Promise((resolve, reject) => {
      const request = this.indexedDB.open(this.databaseName, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('bases')) database.createObjectStore('bases', { keyPath: 'id' });
        if (!database.objectStoreNames.contains('tables')) {
          const tables = database.createObjectStore('tables', { keyPath: 'id' });
          tables.createIndex('byBaseId', 'baseId', { unique: false });
        }
        if (!database.objectStoreNames.contains('records')) {
          const records = database.createObjectStore('records', { keyPath: 'id' });
          records.createIndex('byBaseId', 'baseId', { unique: false });
          records.createIndex('byTableId', ['baseId', 'tableId'], { unique: false });
        }
      };
      request.onsuccess = () => {
        if (request.result.version !== DATABASE_VERSION) {
          request.result.close();
          reject(new BaseOperationError('SCHEMA_VERSION', 'Stored database schema requires an explicit migration'));
          return;
        }
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
      request.onerror = () => reject(this.#storageError(request.error));
      request.onblocked = () => reject(new BaseOperationError('STORAGE_BLOCKED', 'Close other tabs using this database and retry'));
    });
    this.#databasePromise.catch(() => { this.#databasePromise = null; });
    return this.#databasePromise;
  }

  #storageError(error) {
    if (error instanceof BaseOperationError) return error;
    if (error?.name === 'QuotaExceededError') {
      return new BaseOperationError('STORAGE_QUOTA', 'The browser storage quota was reached');
    }
    if (error?.name === 'VersionError') {
      return new BaseOperationError('SCHEMA_VERSION', 'Stored database schema requires an explicit migration');
    }
    return new BaseOperationError('STORAGE_FAILURE', 'The browser storage operation failed');
  }
}
