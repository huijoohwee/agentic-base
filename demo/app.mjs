import { createBaseEngine, IndexedDBAdapter, loadRecordWorkspace } from '../src/index.mjs';
import { mountDataView, mountRecordViewToolbar } from './browser-data-view.js?v=33';
import { enhanceSelects } from './dropdown-menus.js?v=31';
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
  'table-host', 'month-picker', 'month', 'connection', 'offline-state', 'view-toolbar', 'view-kind']
  .map(id => [id, document.getElementById(id)]));
const state = { tableId: 'demo_tasks_v1', baseRevision: null, view: 'table', layout: 'table', orientation: 'rows',
  total: 0, showing: 0, refreshTicket: 0, viewData: null, tableHandle: null, toolbarHandle: null, selectedRowIds: [] };
const projectionLabels = { table: 'Table', matrix: 'Grouped matrix', kanban: 'Kanban', calendar: 'Calendar' };

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

async function ensureSampleTable(tableId, name, fields, samples) {
  const tables = await execute('table.list', { baseId: BASE_ID });
  if (!tables.some(table => table.id === tableId)) {
    const base = await execute('base.get', { baseId: BASE_ID });
    try {
      await execute('table.create', { baseId: BASE_ID, expectedRevision: base.revision, id: tableId, name, fields });
    } catch (error) {
      if (!error.message.startsWith('CONFLICT:') ||
        !(await execute('table.list', { baseId: BASE_ID })).some(table => table.id === tableId)) throw error;
    }
  }
  for (const sample of samples) {
    try {
      await execute('record.get', { baseId: BASE_ID, tableId, recordId: sample.id });
      continue;
    } catch (error) { if (!error.message.startsWith('NOT_FOUND:')) throw error; }
    const latest = await execute('base.get', { baseId: BASE_ID });
    try {
      await execute('record.create', { baseId: BASE_ID, tableId, expectedRevision: latest.revision, ...sample });
    } catch (error) {
      if (!error.message.startsWith('CONFLICT:')) throw error;
      await execute('record.get', { baseId: BASE_ID, tableId, recordId: sample.id });
    }
  }
}

async function createSample() {
  dom['create-sample'].disabled = true;
  try {
    try { await execute('base.create', { id: BASE_ID, name: 'Local tasks' }); }
    catch (error) { if (!error.message.startsWith('CONFLICT:')) throw error; }
    await ensureSampleTable(state.tableId, 'Tasks', FIELDS, [
      { id: 'demo_record_one', values: { title: 'Plan the first integration', status: 'Todo', due: dueDate(8), points: 2, region: 'APAC' } },
      { id: 'demo_record_two', values: { title: 'Prove offline reload', status: 'Doing', due: dueDate(16), points: 3, region: 'APAC' } },
      { id: 'demo_record_three', values: { title: 'Review the shared contract', status: 'Done', due: null, points: 1, region: 'EMEA' } },
    ]);
    await ensureSampleTable('demo_projects_v1', 'Projects', [
      { id: 'name', name: 'Project name', type: 'text', required: true },
      { id: 'area', name: 'Area', type: 'text' },
    ], [
      { id: 'demo_project_one', values: { name: 'Local workspace', area: 'Operations' } },
      { id: 'demo_project_two', values: { name: 'Field review', area: 'Research' } },
    ]);
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

function renderViewToolbar() {
  const subject = state.view === 'matrix' ? 'groups' : state.view === 'kanban' ? 'cards' : state.view === 'calendar' ? 'items' : 'records';
  const count = state.view === 'table' ? state.showing : state.viewData?.rows.length ?? 0;
  const coverage = state.view === 'table' ? `${count} of ${state.total} records`
    : `${count} ${subject} from ${state.showing} selected records (${state.total} total)`;
  const controls = {
    label: 'Views', status: coverage, layout: state.layout, actions: [],
    onLayoutChange(layout) {
      state.layout = layout;
      renderSharedTable();
      renderViewToolbar();
    },
  };
  if (state.toolbarHandle) state.toolbarHandle.update(controls);
  else state.toolbarHandle = mountRecordViewToolbar(dom['view-toolbar'], controls);
}

function renderSharedTable() {
  if (!state.viewData) return;
  const view = {
    ...state.viewData,
    layout: state.layout,
    orientation: state.layout === 'multiDimensional' ? state.orientation : 'rows',
    ariaLabel: `${projectionLabels[state.view]} projection in the shared table view`,
  };
  if (state.layout === 'kanban') {
    // Region headings describe table groups. Only their children represent tasks.
    if (state.view === 'table') view.rows = view.rows.filter(row => row.depth === 2);
    view.groupByColumnId = state.view === 'table' ? 'status' : view.columns[0].id;
  }
  if (state.view === 'table') view.onEditField = id => openLinks(id);
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
  const view = state.view === 'table' ? { kind: 'table' }
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
  renderViewToolbar();
  message(state.total ? '' : 'No records yet. Add a task above to populate this shared table.');
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

const linksHost = document.getElementById('linked-workspace');
const projections = document.getElementById('projections');
let closeWorkspace, opening = false;
async function openLinks(fieldId) {
  if (opening || closeWorkspace) return;
  opening = true;
  try {
    const { mountLinkedWorkspace } = await loadRecordWorkspace();
    projections.hidden = true; linksHost.hidden = false;
    function close() {
      closeWorkspace?.(); closeWorkspace = undefined;
      linksHost.hidden = true; projections.hidden = false;
      if (location.hash.startsWith('#records?')) history.replaceState(history.state, '', location.pathname + location.search);
      refresh().catch(error => message(error.message, true));
      document.getElementById('open-links').focus();
    }
    closeWorkspace = await mountLinkedWorkspace(linksHost, { execute, baseId: BASE_ID, initialTable: state.tableId, editField: fieldId, mountDataView, onClose: close });
  } catch (error) {
    projections.hidden = false; linksHost.hidden = true; message(error.message, true);
  } finally { opening = false; }
}
document.getElementById('open-links').onclick = () => openLinks();
window.addEventListener('hashchange', () => { if (location.hash.startsWith('#records?')) openLinks(); });
await loadExisting();
if (!dom.workspace.hidden && location.hash.startsWith('#records?')) await openLinks();
