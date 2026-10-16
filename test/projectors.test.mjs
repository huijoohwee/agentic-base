import test from 'node:test';
import assert from 'node:assert/strict';
import { projectCalendar, projectKanban, projectMatrix, projectTable } from '../src/projectors.mjs';
import { taskFields } from '../test-support/helpers.mjs';

const table = { id: 'table_tasks', fields: taskFields };
const record = (id, values) => ({ id, revision: 1, values });

test('table projection preserves stable record IDs and selected columns', () => {
  const result = projectTable({ table, records: [
    record('record_b', { title: 'B', status: 'Todo' }),
    record('record_a', { title: 'A', status: 'Done' }),
  ], view: { kind: 'table', columns: ['title', 'status'] } });
  assert.deepEqual(result.rows.map(row => row.id), ['record_a', 'record_b']);
  assert.deepEqual(result.rows[0].cells, ['A', 'Done']);
});

test('matrix projection groups two explicit dimensions deterministically', () => {
  const result = projectMatrix({ table, records: [
    record('record_b', { region: 'North', status: 'Todo' }),
    record('record_a', { region: 'North', status: 'Todo' }),
    record('record_c', { region: 'South', status: 'Done' }),
  ], view: { kind: 'matrix', rowFieldId: 'region', columnFieldId: 'status' } });
  assert.deepEqual(result.rows.map(axis => axis.value), ['North', 'South']);
  assert.deepEqual(result.columns.map(axis => axis.value), ['Done', 'Todo']);
  assert.deepEqual(result.cells.map(cell => [cell.count, cell.recordIds]), [[2, ['record_a', 'record_b']], [1, ['record_c']]]);
});

test('Kanban preserves configured empty lanes and groups unassigned records', () => {
  const result = projectKanban({ table, records: [
    record('record_a', { title: 'A', status: 'Todo' }),
    record('record_b', { title: 'B', status: null }),
  ], view: { kind: 'kanban', groupFieldId: 'status', lanes: [
    { value: 'Todo', label: 'To do' }, { value: 'Doing', label: 'In progress' }, { value: 'Done', label: 'Done' },
  ] } });
  assert.deepEqual(result.lanes.map(lane => lane.label), ['To do', 'In progress', 'Done', 'Unassigned']);
  assert.deepEqual(result.lanes.map(lane => lane.cards.length), [1, 0, 0, 1]);
});

test('Calendar distinguishes scheduled, missing, invalid, and out-of-month records', () => {
  const result = projectCalendar({ table, records: [
    record('record_day', { due: '2026-10-16' }),
    record('record_missing', { due: null }),
    record('record_bad', { due: '2026-02-30' }),
    record('record_outside', { due: '2026-09-30' }),
  ], view: { kind: 'calendar', dateFieldId: 'due', month: '2026-10' } });
  assert.equal(result.days.length, 31);
  assert.deepEqual(result.days[15].records.map(item => item.id), ['record_day']);
  assert.deepEqual(result.unscheduled.map(item => item.id), ['record_missing']);
  assert.deepEqual(result.invalid.map(item => item.id), ['record_bad']);
  assert.deepEqual(result.outsideMonth.map(item => item.id), ['record_outside']);
});

test('invalid view configuration fails without mutating input records', () => {
  const rows = [record('record_a', { title: 'A', status: 'Todo' })];
  assert.throws(() => projectMatrix({ table, records: rows,
    view: { kind: 'matrix', rowFieldId: 'status', columnFieldId: 'status' } }), error => error.code === 'INVALID_VIEW');
  assert.equal(rows[0].id, 'record_a');
});
