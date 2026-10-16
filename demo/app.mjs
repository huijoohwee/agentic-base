import { createBaseEngine, IndexedDBAdapter } from '../src/index.mjs';

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
  'projection', 'month-picker', 'month', 'connection', 'offline-state', 'view-caption', 'view-kind']
  .map(id => [id, document.getElementById(id)]));
const state = { tableId: 'demo_tasks_v1', baseRevision: null, view: 'table', total: 0, showing: 0 };

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

function renderProjection(projection) {
  const output = document.createElement('pre');
  output.className = 'projection-json';
  output.textContent = JSON.stringify(projection, null, 2);
  dom.projection.replaceChildren(output);
}

async function refresh() {
  const base = await execute('base.get', { baseId: BASE_ID });
  state.baseRevision = base.revision;
  const table = await execute('table.list', { baseId: BASE_ID });
  if (!table.some(item => item.id === state.tableId)) throw new Error('The local demo table is missing');
  const query = { limit: 250, sort: [{ fieldId: 'title', direction: 'asc' }] };
  const view = state.view === 'table' ? { kind: 'table', columns: FIELDS.map(field => field.id) }
    : state.view === 'matrix' ? { kind: 'matrix', rowFieldId: 'region', columnFieldId: 'status' }
      : state.view === 'kanban' ? { kind: 'kanban', groupFieldId: 'status', lanes: ['Todo', 'Doing', 'Done'].map(value => ({ value, label: value })) }
        : { kind: 'calendar', dateFieldId: 'due', month: dom.month.value || currentMonth() };
  const result = await execute('view.project', { baseId: BASE_ID, tableId: state.tableId, query, view });
  state.total = result.total;
  state.showing = Math.min(result.total, 250);
  setRevision(result.revision);
  renderProjection(result.projection);
  dom['view-caption'].textContent = `${state.showing} of ${state.total} records; raw ${state.view} projection (page limit 250).`;
  message('Projection read from the current browser origin; view UI belongs to consumers.');
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

await loadExisting();
