import { BaseOperationError, cloneJson } from '../errors.mjs';

export class MemoryAdapter {
  #bases = new Map();
  #tables = new Map();
  #records = new Map();
  #tail = Promise.resolve();

  async load(baseId) {
    const base = this.#bases.get(baseId);
    if (!base) return null;
    return cloneJson({
      base,
      tables: [...this.#tables.values()].filter(table => table.baseId === baseId),
      records: [...this.#records.values()].filter(record => record.baseId === baseId),
    });
  }

  async commit(baseId, { expectedRevision, snapshot, changes }) {
    const prior = this.#tail;
    let release;
    this.#tail = new Promise(resolve => { release = resolve; });
    await prior;
    try {
      const current = this.#bases.get(baseId);
      const actualRevision = current?.revision ?? 0;
      if (actualRevision !== expectedRevision) {
        throw new BaseOperationError('CONFLICT', 'The base changed before this write committed', {
          expectedRevision, actualRevision,
        });
      }
      this.#bases.set(baseId, cloneJson(snapshot.base));
      for (const id of changes.deleteTableIds) this.#tables.delete(id);
      for (const id of changes.deleteRecordIds) this.#records.delete(id);
      for (const table of changes.putTables) this.#tables.set(table.id, cloneJson(table));
      for (const record of changes.putRecords) this.#records.set(record.id, cloneJson(record));
      return cloneJson(snapshot.base);
    } finally {
      release();
    }
  }
}
