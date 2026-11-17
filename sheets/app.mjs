import { CONTRACT, LIMITS, calculate, decodeSnapshot, encodeSnapshot, sampleCells } from './core.mjs';
import { addressOf, coordinate, parseInput, inputOf } from './schema.mjs';
import { createSheetsStore } from './storage.mjs';
const $ = id => document.getElementById(id);
const store = createSheetsStore({ authorize: () => true }); // Local demo policy; not same-origin authentication.
let workbook = null, selected = 'A1', dirty = false, busy = true, imported = null, importGeneration = 0;
const cells = new Map();
const uuid = () => crypto.randomUUID();
const error = value => { $('error').hidden = !value; $('error').textContent = value ? `${value.code ?? 'ERROR'}: ${value.message ?? value}` : ''; };
function state() {
  $('sample').disabled = $('blank').disabled = busy || Boolean(workbook);
  $('download').disabled = busy || !workbook;
  $('reload').disabled = busy;
  $('editor-fieldset').disabled = busy || !workbook;
  $('restore').disabled = busy || !imported || !workbook || imported.workbookId !== workbook.workbookId;
  $('clone').disabled = busy || !imported;
  $('snapshot-file').disabled = busy;
  $('grid-section').setAttribute('aria-busy', String(busy));
  $('draft').textContent = dirty ? `Unsaved draft for ${selected}` : 'Accepted value';
  $('status').textContent = workbook ? `${workbook.name} · revision ${workbook.revision} saved on this device${dirty ? ' · editor has an unsaved draft' : ''}` : 'Create a sample or blank workbook, or import a snapshot.';
}
function editor() {
  const cell = workbook?.cells[selected];
  $('address').textContent = selected;
  $('cell-kind').textContent = cell ? `${cell.type} cell` : 'Empty cell';
  $('cell-input').value = inputOf(cell); dirty = false;
}
function render() {
  const results = workbook ? calculate(workbook) : {};
  for (const [address, element] of cells) {
    const cell = workbook?.cells[address], result = results[address];
    const text = result?.error ? result.display : result?.value == null ? '' : String(result.value);
    element.textContent = text;
    element.title = result?.error ? `${result.error}: ${cell.value}` : text;
    element.dataset.kind = cell?.type ?? 'empty';
    if (result?.error) element.dataset.error = result.error; else delete element.dataset.error;
    element.setAttribute('aria-label', `${address}, ${text || 'empty'}${cell?.type === 'formula' ? `, formula ${cell.value}` : ''}`);
    element.setAttribute('aria-selected', String(selected === address));
    element.tabIndex = selected === address ? 0 : -1;
  }
  $('identity').textContent = workbook ? `Workbook ${workbook.workbookId} · worksheet ${workbook.sheetId}` : '';
  editor(); state();
}
function select(address, focus = false) {
  if (busy) return;
  if (dirty && address !== selected) { error('Commit or cancel the current draft before changing cells.'); return; }
  cells.get(selected).tabIndex = -1; cells.get(selected).setAttribute('aria-selected', 'false');
  selected = address;
  cells.get(address).tabIndex = 0; cells.get(address).setAttribute('aria-selected', 'true');
  if (!dirty) editor();
  if (focus) cells.get(address).focus({ preventScroll: true });
  state();
}
function beginEdit() { if (workbook && !busy) { $('cell-input').focus(); $('cell-input').select(); } }
function buildGrid() {
  const header = document.createElement('tr'), corner = document.createElement('th'); corner.textContent = 'Cell'; header.append(corner);
  for (let column = 0; column < LIMITS.columns; column++) { const th = document.createElement('th'); th.scope = 'col'; th.textContent = String.fromCharCode(65 + column); header.append(th); }
  $('column-head').append(header);
  for (let row = 0; row < LIMITS.rows; row++) {
    const tr = document.createElement('tr'), th = document.createElement('th'); th.scope = 'row'; th.textContent = String(row + 1); tr.append(th);
    for (let column = 0; column < LIMITS.columns; column++) {
      const address = addressOf(row, column), td = document.createElement('td'); td.setAttribute('role', 'gridcell');
      td.addEventListener('click', () => select(address, true)); td.addEventListener('dblclick', beginEdit);
      td.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === 'F2') { event.preventDefault(); beginEdit(); return; }
        const { row: r, column: c } = coordinate(address), offsets = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
        if (event.key in offsets) {
          event.preventDefault(); const [dr, dc] = offsets[event.key];
          const next = addressOf(Math.max(0, Math.min(31, r + dr)), Math.max(0, Math.min(15, c + dc)));
          select(next, true); cells.get(next).scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
      });
      cells.set(address, td); tr.append(td);
    }
    $('grid-body').append(tr);
  }
}
async function act(operation, payload) {
  if (busy) return;
  busy = true; error(null); state();
  try {
    const result = await store.commit({ contract: CONTRACT, operationId: uuid(), operation,
      expectedRevision: workbook?.revision ?? 0, payload });
    workbook = result.workbook; render();
  } catch (failure) { error(failure); }
  finally { busy = false; state(); }
}
$('sample').addEventListener('click', () => act('create', { workbookId: uuid(), sheetId: uuid(), name: 'Line-item workbook', cells: sampleCells() }));
$('blank').addEventListener('click', () => act('create', { workbookId: uuid(), sheetId: uuid(), name: 'Local workbook' }));
$('editor-form').addEventListener('submit', event => {
  event.preventDefault(); if (!workbook || busy) return;
  try { const cell = parseInput($('cell-input').value); void act('setCells', { workbookId: workbook.workbookId, sheetId: workbook.sheetId, changes: [{ address: selected, cell }] }); }
  catch (failure) { error(failure); }
});
$('cell-input').addEventListener('input', () => { dirty = $('cell-input').value !== inputOf(workbook?.cells[selected]); state(); });
function cancel() { editor(); state(); error(null); cells.get(selected).focus(); }
$('cancel').addEventListener('click', cancel);
$('cell-input').addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); cancel(); } });
$('reload').addEventListener('click', async () => {
  if (busy) return; busy = true; state();
  try { workbook = await store.load(); error(null); render(); } catch (failure) { error(failure); }
  finally { busy = false; state(); }
});
$('download').addEventListener('click', () => {
  if (!workbook) return;
  const url = URL.createObjectURL(new Blob([encodeSnapshot(workbook)], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `workbook-${workbook.workbookId}-r${workbook.revision}.json`; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('snapshot-file').addEventListener('change', async event => {
  const generation = ++importGeneration; imported = null; state();
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > LIMITS.bytes) throw new Error('Snapshot exceeds 256 KiB');
    const snapshot = decodeSnapshot(await file.text()); calculate(snapshot);
    if (generation !== importGeneration) return;
    imported = snapshot;
    $('import-summary').textContent = `${snapshot.name} · imported revision ${snapshot.revision} · ${Object.keys(snapshot.cells).length} cells`;
    error(null);
  } catch (failure) { if (generation !== importGeneration) return; $('import-summary').textContent = 'Snapshot rejected; accepted workbook preserved'; error(failure); }
  state();
});
function restore(mode) {
  if (!imported) return;
  const payload = { workbookId: workbook?.workbookId ?? imported.workbookId, snapshot: imported, mode };
  if (mode === 'clone') Object.assign(payload, { newWorkbookId: uuid(), newSheetId: uuid() });
  void act('restore', payload);
}
$('restore').addEventListener('click', () => restore('replace'));
$('clone').addEventListener('click', () => restore('clone'));
buildGrid(); render();
try { workbook = await store.load(); render(); } catch (failure) { error(failure); }
finally { busy = false; state(); }
async function offline() {
  try {
    if (!('serviceWorker' in navigator)) throw new Error('Offline app shell unavailable in this browser');
    const scope = new URL('./', location.href);
    if (!scope.pathname.endsWith('/agentic-sheets/')) throw new Error('Unexpected service-worker scope');
    const existing = await navigator.serviceWorker.getRegistration(scope.href);
    if (navigator.onLine || !existing?.active) await navigator.serviceWorker.register('./sw.js', { scope: './' });
    await navigator.serviceWorker.ready;
    $('connection').textContent = navigator.onLine ? 'Offline app shell ready' : 'Offline · app shell ready';
  } catch (failure) { $('connection').textContent = failure.message; }
}
void offline();
addEventListener('offline', () => { $('connection').textContent = 'Offline · edits stay on this device'; });
addEventListener('online', () => { $('connection').textContent = 'Online · no remote sync'; });
fetch('./artifact-manifest.json').then(response => { if (!response.ok) throw new Error('Artifact identity unavailable'); return response.json(); })
  .then(manifest => { document.documentElement.dataset.artifactDigest = manifest.artifactDigest; $('identity').title = `Artifact ${manifest.artifactDigest}`; })
  .catch(failure => { $('identity').title = failure.message; });
