import { assert } from './errors.mjs';
import { createRecordRelation } from './record-links.mjs';

export const fieldValue = (record, id) => Object.hasOwn(record.values, id) ? record.values[id] : null;

export function assertLinkSchemas(tables) {
  const byId = new Map(tables.map(table => [table.id, table]));
  for (const table of tables) for (const field of table.fields) {
    if (field.type !== 'recordLink') continue;
    const { targetTableId, displayFieldId, supportingFieldIds } = field.link;
    const target = byId.get(targetTableId);
    assert(target, 'INVALID_SCHEMA', 'Linked table does not exist');
    for (const id of [displayFieldId, ...supportingFieldIds]) {
      assert(target.fields.some(column => column.id === id && column.type !== 'recordLink'),
        'INVALID_SCHEMA', 'Picker fields must be scalar fields of the target table');
    }
  }
}

export function assertLinkTargets(table, record, records) {
  for (const field of table.fields) {
    const ids = fieldValue(record, field.id);
    if (field.type !== 'recordLink' || !ids?.length) continue;
    const targets = new Set(records.filter(item => item.tableId === field.link.targetTableId).map(item => item.id));
    assert(ids.every(id => targets.has(id)), 'INVALID_RECORD', 'A linked record is missing from its target table');
  }
}

/** Project an authorized record snapshot. Field identity distinguishes parallel relationships. */
export function createRecordFieldIndex(tables, records) {
  assertLinkSchemas(tables);
  const collections = new Map(tables.map(table => [table.id, new Map()]));
  for (const record of records) {
    const collection = collections.get(record.tableId);
    assert(collection && !collection.has(record.id), 'INVALID_RECORD', 'Unknown table or duplicate record');
    collection.set(record.id, record);
  }
  const relations = new Map(), inbound = new Map();
  for (const table of tables) {
    const fields = new Map();
    relations.set(table.id, fields);
    for (const field of table.fields.filter(item => item.type === 'recordLink')) {
      const sources = collections.get(table.id), targets = collections.get(field.link.targetTableId);
      const links = [];
      for (const source of sources.values()) {
        for (const target of fieldValue(source, field.id) ?? []) links.push({ source: source.id, target });
      }
      const index = createRecordRelation({ sources: sources.keys(), targets: targets.keys(), links });
      const entry = { table, field, index, targets };
      fields.set(field.id, entry);
      if (!inbound.has(field.link.targetTableId)) inbound.set(field.link.targetTableId, []);
      inbound.get(field.link.targetTableId).push(entry);
    }
  }

  function choice(field, record) {
    const label = String(fieldValue(record, field.link.displayFieldId) ?? '') || record.id;
    const supporting = field.link.supportingFieldIds.map(id => ({ fieldId: id, value: fieldValue(record, id) }));
    return { id: record.id, label, supporting };
  }
  return Object.freeze({
    choices(tableId, fieldId, search = '') {
      const entry = relations.get(tableId)?.get(fieldId);
      assert(entry, 'INVALID_SCHEMA', 'Unknown record link field');
      const term = search.trim().toLowerCase();
      return Array.from(entry.targets.values(), record => choice(entry.field, record))
        .filter(item => [item.id, item.label, ...item.supporting.map(cell => cell.value ?? '')]
          .some(value => String(value).toLowerCase().includes(term)));
    },
    related(tableId, recordId) {
      assert(collections.get(tableId)?.has(recordId), 'NOT_FOUND', 'Unknown record');
      const outgoing = [], incoming = [];
      for (const { field, index, targets } of relations.get(tableId).values()) {
        for (const { target } of index.from(recordId)) outgoing.push({ fieldId: field.id,
          tableId: field.link.targetTableId, recordId: target, label: choice(field, targets.get(target)).label });
      }
      for (const { table, field, index } of inbound.get(tableId) ?? []) {
        for (const { source } of index.to(recordId)) incoming.push({ fieldId: field.id, tableId: table.id, recordId: source });
      }
      return { outgoing, incoming };
    },
  });
}
