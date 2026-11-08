import { createBaseEngine, IndexedDBAdapter } from '../src/index.mjs';
import { mountDataView } from './browser-data-view.js?v=27';
import { enhanceSelects } from './dropdown-menus.js?v=27';
enhanceSelects(document);

const BASE_ID = 'demo_base_v1';
const ACTOR_ID = 'local_demo_operator';
const FIELDS = [
  { id: 'title', name: 'Title', type: 'text', required: true },
  { id: 'status', name: 'Status', type: 'select', required: true, options: ['Todo', 'Doing', 'Done'] },
  { id: 'due', name: 'Due date', type: 'date' },
  { id: 'points', name: 'Points', type: 'number' },
  { id: 'region', name: 'Region', type: 'text' },
];
const engine = createBaseEngine({
  adapter: new IndexedDBAdapter({ databaseName: 'agentic_base_demo_v1' }),
  authorize: ({ actorId, baseId }) => actorId === ACTOR_ID && baseId === BASE_ID,
});

const dom = Object.fromEntries(['setup', 'workspace', 'create-sample', 'reload', 'task-form', 'revision', 'message',
  'table-host', 'month-picker', 'month', 'connection', 'offline-state', 'view-caption', 'view-kind', 'view-layout']
  .map(id => [id, document.getElementById(id)]));
const state = { tableId: 'demo_tasks_v1', baseRevision: null, view: 'table', layout: 'table', orientation: 'rows',
  total: 0, showing: 0, refreshTicket: 0, viewData: null, tableHandle: null, selectedRowIds: [] };
const projectionLabels = { table: 'Table', matrix: 'Grouped matrix', kanban: 'Kanban', calendar: 'Calendar' };
const layoutLabels = { table: 'Table', multiDimensional: 'Multi-dimensional Table' };

function message(text, error = false) {
  dom.message.textContent = text;
  dom.message.classList.toggle('error', error);
}

async function execute(operation, payload = {}) {
  const result = await engine.execute({ contractVersion: 1, actorId: ACTOR_ID, operation, payload });
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.data;
}

function currentMonth() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

function dueDate(day) {
  const [year, month] = currentMonth().split('-').map(Number);
  const last = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`;
}

function setRevision(revision) {
  state.baseRevision = revision;
  dom.revision.textContent = `Base revision ${revision} · ${state.total} records`;
}

async function createSample() {
  dom['create-sample'].disabled = true;
  try {
    let base;
    try {
      base = await execute('base.create', { id: BASE_ID, name: 'Local tasks' });
    } catch (error) {
      if (!error.message.startsWith('CONFLICT:')) throw error;
      base = await execute('base.get', { baseId: BASE_ID });
    }
    let table;
    try {
      table = await execute('table.create', { baseId: BASE_ID, expectedRevision: base.revision,
        id: state.tableId, name: 'Tasks', fields: FIELDS });
    } catch (error) {
      if (!error.message.startsWith('CONFLICT:')) throw error;
      table = (await execute('table.list', { baseId: BASE_ID })).find(item => item.id === state.tableId);
      if (!table) throw error;
    }
    const samples = [
      { id: 'demo_record_one', values: { title: 'Plan the first integration', status: 'Todo', due: dueDate(8), points: 2, region: 'APAC' } },
      { id: 'demo_record_two', values: { title: 'Prove offline reload', status: 'Doing', due: dueDate(16), points: 3, region: 'APAC' } },
      { id: 'demo_record_three', values: { title: 'Review the shared contract', status: 'Done', due: null, points: 1, region: 'EMEA' } },
    ];
    for (const sample of samples) {
      try {
        await execute('record.get', { baseId: BASE_ID, tableId: state.tableId, recordId: sample.id });
        continue;
      } catch (error) {
        if (!error.message.startsWith('NOT_FOUND:')) throw error;
      }
      const latest = await execute('base.get', { baseId: BASE_ID });
      try {
        await execute('record.create', { baseId: BASE_ID, tableId: state.tableId,
          expectedRevision: latest.revision, id: sample.id, values: sample.values });
      } catch (error) {
        if (!error.message.startsWith('CONFLICT:')) throw error;
        await execute('record.get', { baseId: BASE_ID, tableId: state.tableId, recordId: sample.id });
      }
    }
    dom.setup.hidden = true;
    dom.workspace.hidden = false;
    await refresh();
  } catch (error) {
    message(error.message, true);
    dom['create-sample'].disabled = false;
  }
}

function cellText(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(cellText).filter(Boolean).join(', ');
  return String(value);
}

function tableColumns(fields) {
  return fields.map(field => ({ id: field.id, name: field.name,
    kind: field.type === 'select' || field.type === 'multi-select' ? field.type : 'text' }));
}

function sharedTableData(projection) {
  if (projection.kind === 'table') {
    const columns = tableColumns(projection.fields);
    const regionIndex = projection.fields.findIndex(field => field.id === 'region');
    const records = projection.rows.map(row => ({ id: row.id, cells: row.cells.map(cellText) }));
    if (regionIndex < 0) return { columns, rows: records };

    const groups = new Map();
    for (const record of records) {
      const region = record.cells[regionIndex] || 'Unassigned';
      if (!groups.has(region)) groups.set(region, []);
      groups.get(region).push(record);
    }
    const usedIds = new Set(records.map(record => record.id));
    let groupIndex = 0;
    const nextGroupId = () => {
      let id;
      do { id = `__agentic_base_region_group_${groupIndex++}`; } while (usedIds.has(id));
      usedIds.add(id);
      return id;
    };
    const rows = [];
    for (const [region, children] of groups) {
      const cells = Array(columns.length).fill('');
      cells[0] = `Region: ${region}`;
      cells[regionIndex] = region;
      rows.push({ id: nextGroupId(), cells, depth: 1 });
      rows.push(...children.map(record => ({ ...record, depth: 2 })));
    }
    return { columns, rows };
  }
  if (projection.kind === 'matrix') {
    const cells = new Map(projection.cells.map(cell => [JSON.stringify([cell.rowKey, cell.columnKey]), cell]));
    const columns = [{ id: 'row-dimension', name: projection.rowField.name },
      ...projection.columns.map((column, index) => ({ id: `matrix-column-${index}`, name: cellText(column.value) || 'Unknown' }))];
    return {
      columns,
      rows: projection.rows.map((row, index) => ({
        id: `matrix-row-${index}`,
        cells: [cellText(row.value) || 'Unknown', ...projection.columns.map(column => {
          const cell = cells.get(JSON.stringify([row.key, column.key]));
          return cell ? `${cell.count} record${cell.count === 1 ? '' : 's'}` : '—';
        })],
      })),
    };
  }
  if (projection.kind === 'kanban') {
    const fields = projection.groupField ? FIELDS.filter(field => field.id !== projection.groupField.id) : FIELDS;
    return {
      columns: [{ id: 'kanban-lane', name: projection.groupField.name }, ...tableColumns(fields)],
      rows: projection.lanes.flatMap(lane => lane.cards.map(card => ({
        id: card.id, cells: [lane.label, ...fields.map(field => cellText(card.values[field.id]))],
      }))),
    };
  }
  if (projection.kind === 'calendar') {
    const rows = [];
    const add = (label, record) => rows.push({
      id: record.id, cells: [label, ...FIELDS.map(field => cellText(record.values[field.id]))],
    });
    for (const day of projection.days) for (const record of day.records) add(day.date, record);
    for (const record of projection.unscheduled) add('Unscheduled', record);
    for (const record of projection.invalid) add(`Invalid date: ${cellText(record.value)}`, record);
    for (const record of projection.outsideMonth) add(`Outside ${projection.month}: ${cellText(record.values[projection.dateField.id])}`, record);
    return { columns: [{ id: 'calendar-schedule', name: 'Schedule' }, ...tableColumns(FIELDS)], rows };
  }
  throw new TypeError(`Unsupported shared table projection: ${String(projection.kind)}`);
}

function updateViewCaption() {
  const subject = state.view === 'matrix' ? 'groups' : state.view === 'kanban' ? 'cards' : state.view === 'calendar' ? 'items' : 'records';
  const count = state.view === 'table' ? state.showing : state.viewData?.rows.length ?? 0;
  const coverage = state.view === 'table' ? `${count} of ${state.total} records`
    : `${count} ${subject} from ${state.showing} selected records (${state.total} total)`;
  dom['view-caption'].textContent = `${coverage} · ${projectionLabels[state.view]} through ${layoutLabels[state.layout]}.`;
}

function renderSharedTable() {
  if (!state.viewData) return;
  const view = {
    ...state.viewData,
    layout: state.layout,
    orientation: state.layout === 'multiDimensional' ? state.orientation : 'rows',
    ariaLabel: `${projectionLabels[state.view]} projection in the shared table view`,
  };
  const visibleRowIds = new Set(view.rows.map(row => row.id));
  view.selectedRowIds = state.selectedRowIds.filter(id => visibleRowIds.has(id));
  view.onSelectionChange = selectedRowIds => {
    state.selectedRowIds = selectedRowIds.filter(id => view.rows.some(row => row.id === id && row.depth !== undefined));
    renderSharedTable();
  };
  if (state.layout === 'multiDimensional') {
    view.onOrientationChange = orientation => {
      state.orientation = orientation;
      renderSharedTable();
    };
  }
  if (state.tableHandle) state.tableHandle.update(view);
  else state.tableHandle = mountDataView(dom['table-host'], view);
}

async function refresh() {
  const ticket = ++state.refreshTicket;
  const table = await execute('table.list', { baseId: BASE_ID });
  if (!table.some(item => item.id === state.tableId)) throw new Error('The local demo table is missing');
  const query = { limit: 250, sort: [{ fieldId: 'title', direction: 'asc' }] };
  const view = state.view === 'table' ? { kind: 'table', columns: FIELDS.map(field => field.id) }
    : state.view === 'matrix' ? { kind: 'matrix', rowFieldId: 'region', columnFieldId: 'status' }
      : state.view === 'kanban' ? { kind: 'kanban', groupFieldId: 'status', lanes: ['Todo', 'Doing', 'Done'].map(value => ({ value, label: value })) }
        : { kind: 'calendar', dateFieldId: 'due', month: dom.month.value || currentMonth() };
  const result = await execute('view.project', { baseId: BASE_ID, tableId: state.tableId, query, view });
  if (ticket !== state.refreshTicket) return;
  state.total = result.total;
  state.showing = Math.min(result.total, 250);
  state.selectedRowIds = [];
  setRevision(result.revision);
  state.viewData = sharedTableData(result.projection);
  renderSharedTable();
  updateViewCaption();
  message(state.total ? 'Local projection rendered by the shared Base table.' : 'No records yet. Add a task above to populate this shared table.');
}

async function addTask(event) {
  event.preventDefault();
  const form = new FormData(dom['task-form']);
  dom['task-form'].querySelector('button[type="submit"]').disabled = true;
  try {
    const base = await execute('base.get', { baseId: BASE_ID });
    const values = {
      title: String(form.get('title')).trim(),
      status: String(form.get('status')),
      due: String(form.get('due') || '') || null,
      points: form.get('points') === '' ? null : Number(form.get('points')),
      region: String(form.get('region') || '') || null,
    };
    await execute('record.create', { baseId: BASE_ID, tableId: state.tableId, expectedRevision: base.revision, values });
    dom['task-form'].reset();
    await refresh();
  } catch (error) {
    message(error.message, true);
  } finally {
    dom['task-form'].querySelector('button[type="submit"]').disabled = false;
  }
}

async function loadExisting() {
  try {
    const base = await execute('base.get', { baseId: BASE_ID });
    state.baseRevision = base.revision;
    dom.setup.hidden = true;
    dom.workspace.hidden = false;
    await refresh();
  } catch (error) {
    if (error.message.startsWith('NOT_FOUND:')) return;
    message(error.message, true);
  }
}

function setConnection() {
  dom.connection.textContent = navigator.onLine ? 'Browser reports online' : 'Browser reports offline';
}

dom['create-sample'].addEventListener('click', createSample);
dom.reload.addEventListener('click', () => refresh().catch(error => message(error.message, true)));
dom['task-form'].addEventListener('submit', addTask);
dom.month.value = currentMonth();
dom.month.addEventListener('change', () => {
  if (state.view === 'calendar') refresh().catch(error => message(error.message, true));
});
dom['view-kind'].addEventListener('change', () => {
  state.view = dom['view-kind'].value;
  dom['month-picker'].hidden = state.view !== 'calendar';
  refresh().catch(error => message(error.message, true));
});
dom['view-layout'].addEventListener('change', () => {
  state.layout = dom['view-layout'].value;
  renderSharedTable();
  updateViewCaption();
});
window.addEventListener('online', setConnection);
window.addEventListener('offline', setConnection);
setConnection();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(() => {
    dom['offline-state'].textContent = 'App shell cached for offline reload';
  }).catch(() => {
    dom['offline-state'].textContent = 'Offline app shell unavailable on this origin';
  });
} else {
  dom['offline-state'].textContent = 'Service workers are unavailable on this browser';
}

await loadExisting();
