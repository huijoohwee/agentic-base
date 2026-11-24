import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecordFieldIndex } from '../src/index.mjs';
import { harness } from '../test-support/helpers.mjs';

test('field declarations, reverse links and picker display survive revisions and reject incompatible writes', async () => {
  const { run, adapter } = harness();
  const baseId = 'sample', tableId = 'notes';
  let revision = 0;
  async function write(op, payload, failure) {
    const result = await run(op, { baseId, expectedRevision: revision, ...payload });
    if (failure) {
      assert.equal(result.error?.code, failure);
      assert.equal((await adapter.load(baseId)).base.revision, revision);
    } else { assert.equal(result.ok, true, JSON.stringify(result.error)); revision = result.data.revision; }
  }
  revision = (await run('base.create', { id: baseId, name: 'Sample' })).data.revision;
  const text = { id: 'name', name: 'Name', type: 'text' };
  await write('table.create', { id: 'people', name: 'People', fields: [text, { id: 'code', type: 'number', name: 'Code' }] });
  await write('table.create', { id: tableId, name: 'Notes', fields: [text] });
  const field = { id: 'owners', type: 'recordLink', name: 'Owners',
    link: { targetTableId: 'people', displayFieldId: 'name', supportingFieldIds: ['code'], multiple: true } };
  const set = (changes, failure) => write('field.set', { tableId, field: { ...field, link: { ...field.link, ...changes } } }, failure);
  await set({ targetTableId: 'absent' }, 'INVALID_SCHEMA');
  await set({ supportingFieldIds: ['name'] }, 'INVALID_SCHEMA');
  await set({});
  for (const [id, code] of [['one', 0], ['two', 9]]) {
    await write('record.create', { tableId: 'people', id, values: { name: 'Same', code } });
  }
  await write('record.create', { tableId, id: 'note', values: { owners: ['one', 'two'] } });
  const snap = await adapter.load(baseId);
  const index = createRecordFieldIndex(snap.tables, snap.records);
  assert.deepEqual(index.choices(tableId, 'owners', '0'), [{ id: 'one', label: 'Same', supporting: [{ fieldId: 'code', value: 0 }] }]);
  assert.deepEqual(index.related(tableId, 'note').outgoing.map(e => e.recordId), ['one', 'two']);
  assert.deepEqual(index.related('people', 'two').incoming, [{ fieldId: 'owners', tableId, recordId: 'note' }]);
  await set({ multiple: false }, 'INVALID_RECORD');
  await set({ targetTableId: tableId, supportingFieldIds: [] }, 'CONFLICT');
  await write('record.update', { tableId, recordId: 'note', expectedRecordRevision: 1, values: { owners: ['note'] } }, 'INVALID_RECORD');
  await write('record.update', { tableId, recordId: 'note', expectedRecordRevision: 1, values: { owners: ['one', 'one'] } }, 'INVALID_RECORD');
  await write('record.delete', { tableId: 'people', recordId: 'one', expectedRecordRevision: 1 }, 'CONFLICT');
  const list = await run('record.list', { baseId, tableId, filter: { fieldId: 'owners', operator: 'contains', value: 'one' } });
  assert.deepEqual(list.data.items.map(r => r.id), ['note']);
  await write('record.update', { tableId, recordId: 'note', expectedRecordRevision: 1, values: { owners: ['one'] } });
  await set({ multiple: false });
  await write('record.delete', { tableId: 'people', recordId: 'two', expectedRecordRevision: 1 });
  await write('field.set', { tableId, expectedRevision: 1, field }, 'CONFLICT');
});

test('link writes require access to each destination', async () => {
  const { run } = harness({ authorize: ({ operation, recordId }) => !(operation === 'record.get' && recordId === 'hidden') });
  const baseId = 'b', tableId = 't';
  await run('base.create', { id: baseId, name: 'Base' });
  const fields = [{ id: 'name', name: 'Name', type: 'text' }, { id: 'ref', name: 'Record', type: 'recordLink',
    link: { targetTableId: tableId, displayFieldId: 'name', multiple: false } }];
  assert.equal((await run('table.create', { baseId, id: tableId, name: 'Table', fields, expectedRevision: 1 })).ok, true);
  assert.equal((await run('record.create', { baseId, tableId, id: 'hidden', values: {}, expectedRevision: 2 })).ok, true);
  const result = await run('record.create', { baseId, tableId, id: 'other', values: { ref: ['hidden'] }, expectedRevision: 3 });
  assert.equal(result.error?.code, 'FORBIDDEN');
});

test('scoped record bookmarks cannot resolve a bare row from another table', async () => {
  const { createRecordLinkCodec } = await import('../src/record-links.mjs');
  const codec = createRecordLinkCodec({ fragment: 'inventory', views: [{ view: 'record', group: 'collection', requireGroup: true }] });
  const dest = { view: 'record', group: 'Shelf & rack', record: 'A/B#2' };
  assert.deepEqual(codec.parse(codec.href(dest)), dest);
  assert.equal(codec.parse('#inventory?record=A%2FB%232'), null);
  assert.throws(() => codec.href({ view: 'record', record: 'X' }), /destination/);
  assert.deepEqual(codec.parse('#inventory?collection=Shelf'), { view: 'record', group: 'Shelf' });
});
