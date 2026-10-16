import { assert } from './errors.mjs';
import { compareValue } from './query.mjs';
import { plainObject, validateFieldValue, validateId, validateName, validDateOnly } from './schema.mjs';

const fieldFor = (fields, fieldId) => fields.find(field => field.id === fieldId);
const stableValueKey = value => value === null || value === undefined ? 'null:' : `${typeof value}:${String(value)}`;
const recordOrder = (left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
const publicRecord = record => ({ id: record.id, revision: record.revision, values: record.values });

function validateColumns(columns, fields) {
  assert(Array.isArray(columns) && columns.length > 0 && columns.length <= fields.length,
    'INVALID_VIEW', 'A table view needs one or more visible columns');
  const result = columns.map(id => validateId(id, 'column field ID'));
  assert(result.every(id => fieldFor(fields, id)), 'INVALID_VIEW', 'A table view references an unknown field');
  assert(new Set(result).size === result.length, 'INVALID_VIEW', 'A table view cannot repeat columns');
  return result;
}

function validateMonth(month) {
  assert(typeof month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/u.test(month),
    'INVALID_VIEW', 'Calendar month must use YYYY-MM');
  return month;
}

export function projectTable({ table, records, view }) {
  plainObject(view, 'view');
  assert(view.kind === 'table', 'INVALID_VIEW', 'Expected a table view');
  const columns = validateColumns(view.columns ?? table.fields.map(field => field.id), table.fields);
  const fields = columns.map(id => table.fields.find(field => field.id === id));
  return {
    kind: 'table', tableId: table.id, fields,
    rows: [...records].sort(recordOrder).map(record => ({ ...publicRecord(record), cells: columns.map(id => record.values[id] ?? null) })),
  };
}

export function projectMatrix({ table, records, view }) {
  plainObject(view, 'view');
  assert(view.kind === 'matrix', 'INVALID_VIEW', 'Expected a matrix view');
  const rowFieldId = validateId(view.rowFieldId, 'row dimension field ID');
  const columnFieldId = validateId(view.columnFieldId, 'column dimension field ID');
  assert(rowFieldId !== columnFieldId, 'INVALID_VIEW', 'Matrix dimensions must use different fields');
  const rowField = fieldFor(table.fields, rowFieldId);
  const columnField = fieldFor(table.fields, columnFieldId);
  assert(rowField && columnField, 'INVALID_VIEW', 'Matrix dimensions must reference table fields');
  const rowValues = new Map();
  const columnValues = new Map();
  const cells = new Map();
  for (const record of records) {
    const rowValue = record.values[rowFieldId] ?? null;
    const columnValue = record.values[columnFieldId] ?? null;
    const rowKey = stableValueKey(rowValue);
    const columnKey = stableValueKey(columnValue);
    rowValues.set(rowKey, rowValue);
    columnValues.set(columnKey, columnValue);
    const key = JSON.stringify([rowKey, columnKey]);
    if (!cells.has(key)) cells.set(key, { rowKey, columnKey, recordIds: [], count: 0 });
    const cell = cells.get(key);
    cell.recordIds.push(record.id);
    cell.count += 1;
  }
  const axes = map => [...map.entries()].map(([key, value]) => ({ key, value }))
    .sort((left, right) => compareValue(left.value, right.value));
  const rows = axes(rowValues);
  const columns = axes(columnValues);
  const projectedCells = [...cells.values()].map(cell => ({ ...cell, recordIds: cell.recordIds.sort() }))
    .sort((left, right) => left.rowKey < right.rowKey ? -1 : left.rowKey > right.rowKey ? 1
      : left.columnKey < right.columnKey ? -1 : left.columnKey > right.columnKey ? 1 : 0);
  return { kind: 'matrix', tableId: table.id, rowField, columnField, rows, columns, cells: projectedCells };
}

export function projectKanban({ table, records, view }) {
  plainObject(view, 'view');
  assert(view.kind === 'kanban', 'INVALID_VIEW', 'Expected a Kanban view');
  const groupFieldId = validateId(view.groupFieldId, 'group field ID');
  const groupField = fieldFor(table.fields, groupFieldId);
  assert(groupField, 'INVALID_VIEW', 'Kanban grouping must reference a table field');
  const configured = view.lanes ?? groupField.options?.map(value => ({ value, label: value })) ?? [];
  assert(Array.isArray(configured) && configured.length <= 64, 'LIMIT_EXCEEDED', 'Kanban has too many configured lanes');
  const lanes = configured.map(item => {
    plainObject(item, 'Kanban lane');
    const value = validateFieldValue({ ...groupField, required: false }, item.value);
    return { key: stableValueKey(value), value, label: validateName(item.label ?? String(value), 'lane label'), configured: true };
  });
  assert(new Set(lanes.map(lane => lane.key)).size === lanes.length, 'INVALID_VIEW', 'Kanban lanes must be unique');
  const values = new Map(lanes.map(lane => [lane.key, lane.value]));
  for (const record of records) {
    const value = record.values[groupFieldId] ?? null;
    const key = stableValueKey(value);
    if (!values.has(key) && value !== null) values.set(key, value);
  }
  const configuredKeys = new Set(lanes.map(lane => lane.key));
  const extraLanes = [...values.entries()].filter(([key, value]) => !configuredKeys.has(key) && value !== null)
    .map(([key, value]) => ({ key, value, label: String(value), configured: false }))
    .sort((left, right) => compareValue(left.value, right.value));
  const allLanes = [...lanes, ...extraLanes, { key: 'null:', value: null, label: 'Unassigned', configured: true }];
  return {
    kind: 'kanban', tableId: table.id, groupField,
    lanes: allLanes.map(lane => ({ ...lane,
      cards: records.filter(record => stableValueKey(record.values[groupFieldId] ?? null) === lane.key)
        .sort(recordOrder).map(publicRecord),
    })),
  };
}

export function projectCalendar({ table, records, view }) {
  plainObject(view, 'view');
  assert(view.kind === 'calendar', 'INVALID_VIEW', 'Expected a calendar view');
  const dateFieldId = validateId(view.dateFieldId, 'calendar date field ID');
  const dateField = fieldFor(table.fields, dateFieldId);
  assert(dateField?.type === 'date', 'INVALID_VIEW', 'Calendar must use a date field');
  const month = validateMonth(view.month);
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(0);
  lastDay.setUTCHours(0, 0, 0, 0);
  lastDay.setUTCFullYear(year, monthNumber, 0);
  const dayCount = lastDay.getUTCDate();
  const days = Array.from({ length: dayCount }, (_, index) => {
    const day = index + 1;
    return { date: `${month}-${String(day).padStart(2, '0')}`, day, records: [] };
  });
  const unscheduled = [];
  const invalid = [];
  const outsideMonth = [];
  for (const record of records) {
    const value = record.values[dateFieldId];
    if (value === null || value === undefined || value === '') {
      unscheduled.push(publicRecord(record));
    } else if (!validDateOnly(value)) {
      invalid.push({ ...publicRecord(record), value });
    } else if (value.startsWith(`${month}-`)) {
      const day = Number(value.slice(-2));
      days[day - 1].records.push(publicRecord(record));
    } else {
      outsideMonth.push(publicRecord(record));
    }
  }
  days.forEach(day => day.records.sort(recordOrder));
  return { kind: 'calendar', tableId: table.id, dateField, month, days,
    unscheduled: unscheduled.sort(recordOrder), invalid: invalid.sort(recordOrder), outsideMonth: outsideMonth.sort(recordOrder) };
}

export function projectView({ table, records, view }) {
  switch (view?.kind) {
    case 'table': return projectTable({ table, records, view });
    case 'matrix': return projectMatrix({ table, records, view });
    case 'kanban': return projectKanban({ table, records, view });
    case 'calendar': return projectCalendar({ table, records, view });
    default: assert(false, 'INVALID_VIEW', `Unsupported view kind: ${String(view?.kind)}`);
  }
}
