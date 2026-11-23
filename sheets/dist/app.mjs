// One native single-line draft field. The host owns the value and the commit decision.
export function mountInlineEditor(host, { value, label, describedBy, onInput, onCommit, onCancel }) {
  if (!label || typeof onInput !== 'function' || typeof onCommit !== 'function' || typeof onCancel !== 'function') {
    throw new TypeError('Inline editing requires a label and input, commit and cancel handlers');
  }
  if (host.hasAttribute('data-agentic-inline-editing')) throw new Error('This host already has an inline editor');
  const field = host.ownerDocument.createElement('input');
  field.type = 'text';
  field.className = 'agentic-inline-editor';
  field.value = value;
  field.autocomplete = 'off';
  field.autocapitalize = 'off';
  field.spellcheck = false;
  field.enterKeyHint = 'done';
  field.setAttribute('aria-label', label);
  if (describedBy) field.setAttribute('aria-describedby', describedBy);

  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  let composing = false;
  field.addEventListener('compositionstart', () => { composing = true; }, options);
  field.addEventListener('compositionend', () => { composing = false; }, options);
  field.addEventListener('input', () => onInput(field.value), options);
  field.addEventListener('keydown', event => {
    if (composing || event.isComposing || event.keyCode === 229 || field.readOnly) return;
    if (event.key !== 'Enter' && event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Enter') onCommit();
    else onCancel();
  }, options);
  host.setAttribute('data-agentic-inline-editing', '');
  host.append(field);
  return {
    input: field,
    destroy() {
      if (listeners.signal.aborted) return;
      listeners.abort();
      field.remove();
      host.removeAttribute('data-agentic-inline-editing');
    },
  };
}

import { CONTRACT, LIMITS, calculate, decodeSnapshot, encodeSnapshot, inspectFormulaDraft, listFunctions, sampleCells } from './core.mjs';
import { addressOf, columnLabel, fitsGrid, parseInput, inputOf } from './schema.mjs';
import { createSheetsStore } from './storage.mjs';
const $ = id => document.getElementById(id);
const store = createSheetsStore({ authorize: () => true }); // Local demo policy; not same-origin authentication.
let workbook = null, selected = 'A1', dirty = false, busy = true, imported = null, importGeneration = 0;
const cells = new Map();
let inlineEditor = null, gridRows = 0, gridColumns = 0;
const uuid = () => crypto.randomUUID();
const error = value => { $('error').hidden = !value; $('error').textContent = value ? `${value.code ?? 'ERROR'}: ${value.message ?? value}` : ''; };
function state() {
  $('sample').disabled = $('blank').disabled = busy || Boolean(workbook);
  $('download').disabled = busy || !workbook;
  $('reload').disabled = busy;
  $('editor-fieldset').disabled = busy || !workbook;
  if (inlineEditor) inlineEditor.input.readOnly = busy;
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
  showFormulaHints(null, null);
}
const formulaInput = $('cell-input');
const referenceList = $('formula-references');
const functionHelp = $('function-help');
const functionsTrigger = $('open-functions');
const functionsByName = new Map(listFunctions().map(fn => [fn.name, fn]));
function code(text) {
  const element = document.createElement('code');
  element.textContent = text;
  return element;
}
for (const fn of functionsByName.values()) {
  const item = document.createElement('li');
  item.className = 'agentic-collection-item';
  item.dataset.layout = 'list';
  const term = document.createElement('span');
  term.className = 'agentic-collection-term';
  const definition = document.createElement('div');
  term.append(code(fn.signature));
  const example = document.createElement('p');
  const inputs = Object.entries(fn.example.cells).map(([address, value]) => `${address} = ${value}`).join(', ');
  example.append(`With ${inputs}, `, code(fn.example.formula), ` returns ${fn.example.result}.`);
  definition.append(fn.summary, ' ', fn.arguments.map(arg => arg.description).join(' '), example);
  item.append(term, definition);
  $('function-list').append(item);
}
// The panel owns tab navigation. Sheets owns the active workbook editor and its draft.
let helpOrigin = null;
function rememberEditor(field) {
  if (field !== formulaInput && (!inlineEditor || field !== inlineEditor.input)) return;
  helpOrigin = { field, address: selected, value: field.value, start: field.selectionStart,
    end: field.selectionEnd, direction: field.selectionDirection };
}
functionsTrigger.addEventListener('pointerdown', () => rememberEditor(document.activeElement));
functionsTrigger.addEventListener('focus', event => rememberEditor(event.relatedTarget));
functionsTrigger.addEventListener('blur', event => {
  if (!$('workbook-panel').contains(event.relatedTarget)) helpOrigin = null;
});
function returnToDraft() {
  const origin = helpOrigin;
  helpOrigin = null;
  if (origin && !busy && workbook && origin.field.isConnected && origin.address === selected
      && origin.value === origin.field.value) {
    origin.field.focus();
    origin.field.setSelectionRange(origin.start, origin.end, origin.direction);
  } else functionsTrigger.focus();
}
async function firstOpen() {
  functionsTrigger.removeEventListener('click', firstOpen);
  try {
    const { openWorkbookTools } = await import('./floating-panel.mjs');
    openWorkbookTools(functionsTrigger, $('workbook-panel'), returnToDraft);
  } catch (failure) {
    error(failure);
    functionsTrigger.addEventListener('click', firstOpen);
  }
}
functionsTrigger.addEventListener('click', firstOpen);
let inspectedDraft = null, inspectedCaret = null, shownLabels = '';
const markedReferences = new Set();
function showFormulaHints(source, caret) {
  if (source === inspectedDraft && caret === inspectedCaret) return;
  const { references, functionName } = inspectFormulaDraft(source, caret, { rows: gridRows, columns: gridColumns });
  const labels = references.map(reference => reference.label).join(' ');
  if (labels !== shownLabels) {
    shownLabels = labels;
    for (const address of markedReferences) delete cells.get(address).dataset.agenticReference;
    markedReferences.clear();
    // Keep the accessible label and replace only the generated address labels.
    referenceList.replaceChildren(referenceList.firstElementChild);
    references.forEach(({ label, addresses }, index) => {
      const slot = String(1 + index % 3);
      const item = document.createElement('code');
      item.className = 'agentic-reference-label';
      item.dataset.agenticReference = slot;
      item.textContent = label;
      referenceList.append(item);
      for (const address of addresses) {
        if (markedReferences.has(address) || !cells.has(address)) continue;
        cells.get(address).dataset.agenticReference = slot;
        markedReferences.add(address);
      }
    });
    referenceList.hidden = references.length === 0;
  }
  const fn = functionsByName.get(functionName);
  if (fn && functionHelp.dataset.functionId !== fn.id) {
    functionHelp.replaceChildren(code(fn.signature), ' ', fn.summary);
    functionHelp.dataset.functionId = fn.id;
  }
  functionHelp.hidden = !fn;
  const descriptions = ['syntax', 'draft'];
  if (!referenceList.hidden) descriptions.push(referenceList.id);
  if (!functionHelp.hidden) descriptions.push(functionHelp.id);
  const description = descriptions.join(' ');
  formulaInput.setAttribute('aria-describedby', description);
  inlineEditor?.input.setAttribute('aria-describedby', description);
  inspectedDraft = source;
  inspectedCaret = caret;
}
function inspectEditor() {
  const field = document.activeElement;
  if ((field === formulaInput || field === inlineEditor?.input) && !busy && workbook && field.value.startsWith('=')) {
    showFormulaHints(field.value, field.selectionStart);
  } else showFormulaHints(null, null);
}
function markSelected(element, active) {
  element.tabIndex = active ? 0 : -1;
  element.setAttribute('aria-selected', String(active));
  element.classList.toggle('agentic-control-selected', active);
}
function closeInlineEditor() {
  inlineEditor?.destroy();
  inlineEditor = null;
}
function render() {
  closeInlineEditor();
  const rows = workbook?.rows ?? 1, columns = workbook?.columns ?? 1;
  // A trailing editable edge lets the next accepted value grow the saved sheet.
  const nextRows = fitsGrid(rows + 1, columns) ? rows + 1 : rows;
  const nextColumns = fitsGrid(rows, columns + 1) ? columns + 1 : columns;
  if (nextRows !== gridRows || nextColumns !== gridColumns) buildGrid(nextRows, nextColumns);
  const results = workbook ? calculate(workbook) : {};
  for (const [address, element] of cells) {
    const cell = workbook?.cells[address], result = results[address];
    const text = result?.error ? result.display : result?.value == null ? '' : String(result.value);
    element.textContent = text;
    element.title = result?.error ? `${result.error}: ${cell.value}` : text;
    element.dataset.kind = cell?.type ?? 'empty';
    if (result?.error) element.dataset.error = result.error; else delete element.dataset.error;
    element.setAttribute('aria-label', `${address}, ${text || 'empty'}${cell?.type === 'formula' ? `, formula ${cell.value}` : ''}`);
    markSelected(element, selected === address);
  }
  $('dimensions').textContent = workbook ? workbook.rows + ' rows × ' + workbook.columns + ' columns' : '';
  $('identity').textContent = workbook ? `Workbook ${workbook.workbookId} · worksheet ${workbook.sheetId}` : '';
  editor(); state();
}
function select(address, focus = false) {
  if (busy) return false;
  if (dirty && address !== selected) {
    error('Commit or cancel the current draft before changing cells.');
    (inlineEditor?.input ?? formulaInput).focus();
    return false;
  }
  if (address !== selected) {
    closeInlineEditor();
    markSelected(cells.get(selected), false);
    selected = address;
    markSelected(cells.get(selected), true);
    editor();
  }
  if (focus) cells.get(address).focus({ preventScroll: true });
  state();
  return true;
}
function beginInlineEdit(replacement) {
  if (!workbook || busy) return;
  if (!inlineEditor) {
    inlineEditor = mountInlineEditor(cells.get(selected), {
      value: formulaInput.value, label: 'Edit cell ' + selected,
      describedBy: formulaInput.getAttribute('aria-describedby'),
      onInput: value => updateDraft(value),
      onCommit: () => commitDraft(), onCancel: cancel,
    });
    inlineEditor.input.addEventListener('focus', inspectEditor);
    inlineEditor.input.addEventListener('blur', () => showFormulaHints(null, null));
  }
  const field = inlineEditor.input;
  if (replacement !== undefined) {
    field.value = replacement;
    updateDraft(replacement);
  }
  field.focus();
  field.setSelectionRange(field.value.length, field.value.length);
  inspectEditor();
}
function buildGrid(rows, columns) {
  showFormulaHints(null, null);
  cells.clear();
  $('column-head').replaceChildren(); $('grid-body').replaceChildren();
  gridRows = rows; gridColumns = columns;
  const grid = $('grid-section').querySelector('[role="grid"]');
  grid.setAttribute('aria-rowcount', String(rows + 1));
  grid.setAttribute('aria-colcount', String(columns + 1));
  const header = document.createElement('tr'), corner = document.createElement('th'); corner.className = 'agentic-table-column-header'; corner.scope = 'col'; corner.textContent = 'Cell'; header.append(corner);
  for (let column = 0; column < columns; column++) { const th = document.createElement('th'); th.scope = 'col'; th.className = 'agentic-table-column-header'; th.textContent = columnLabel(column); header.append(th); }
  $('column-head').append(header);
  for (let row = 0; row < rows; row++) {
    const tr = document.createElement('tr'), th = document.createElement('th'); th.scope = 'row'; th.textContent = String(row + 1); tr.append(th);
    for (let column = 0; column < columns; column++) {
      const address = addressOf(row, column), td = document.createElement('td'); td.setAttribute('role', 'gridcell');
      td.className = 'agentic-grid-cell';
      td.id = `cell-${address}`;
      if (row === rows - 1 && column === columns - 1 && !fitsGrid(rows, columns)) {
        td.setAttribute('aria-disabled', 'true'); tr.append(td); continue;
      }
      td.addEventListener('click', event => {
        if (event.target !== td) return;
        if (selected === address && workbook) beginInlineEdit();
        else select(address, true);
      });
      td.addEventListener('keydown', event => {
        if (event.target !== td || busy || address !== selected || event.isComposing || event.keyCode === 229) return;
        if (event.key === 'Enter' || event.key === 'F2') { event.preventDefault(); beginInlineEdit(); return; }
        if (workbook && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault(); beginInlineEdit(event.key); return;
        }
        const offsets = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
        if (event.key in offsets) {
          event.preventDefault(); const [dr, dc] = offsets[event.key];
          const next = addressOf(Math.max(0, Math.min(rows - 1, row + dr)), Math.max(0, Math.min(columns - 1, column + dc)));
          if (cells.has(next) && select(next, true)) cells.get(next).scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
      });
      cells.set(address, td); tr.append(td);
    }
    $('grid-body').append(tr);
  }
  if (!cells.has(selected)) selected = 'A1';
}
async function act(operation, payload) {
  if (busy) return;
  busy = true; error(null); state();
  try {
    const result = await store.commit({ contract: CONTRACT, operationId: uuid(), operation,
      expectedRevision: workbook?.revision ?? 0, payload });
    workbook = result.workbook; render();
    return true;
  } catch (failure) { error(failure); }
  finally { busy = false; state(); }
}
const markWorksheet = $('mark-worksheet');
markWorksheet.addEventListener('click', () => {
  const grid = $('grid-section');
  const marked = grid.dataset.agenticAnnotationTarget !== 'true';
  if (marked) grid.dataset.agenticAnnotationTarget = 'true';
  else delete grid.dataset.agenticAnnotationTarget;
  markWorksheet.setAttribute('aria-pressed', String(marked));
});
$('sample').addEventListener('click', () => act('create', { workbookId: uuid(), sheetId: uuid(), name: 'Line-item workbook', fitToCells: true, cells: sampleCells() }));
$('blank').addEventListener('click', () => act('create', { workbookId: uuid(), sheetId: uuid(), name: 'Local workbook', fitToCells: true }));
async function commitDraft() {
  if (!workbook || busy) return;
  const editingInCell = Boolean(inlineEditor);
  if (editingInCell && !dirty) { cancel(); return; }
  try {
    const cell = parseInput(formulaInput.value);
    const saved = await act('setCells', { workbookId: workbook.workbookId, sheetId: workbook.sheetId, changes: [{ address: selected, cell }] });
    if (editingInCell && saved) cells.get(selected).focus({ preventScroll: true });
    if (editingInCell && !saved) inlineEditor?.input.focus();
  } catch (failure) { error(failure); inlineEditor?.input.focus(); }
}
$('editor-form').addEventListener('submit', event => { event.preventDefault(); void commitDraft(); });
function updateDraft(value) {
  if (formulaInput.value !== value) formulaInput.value = value;
  if (inlineEditor && inlineEditor.input.value !== value) inlineEditor.input.value = value;
  dirty = value !== inputOf(workbook?.cells[selected]);
  inspectEditor(); state();
}
formulaInput.addEventListener('input', () => updateDraft(formulaInput.value));
formulaInput.addEventListener('focus', inspectEditor);
formulaInput.addEventListener('blur', () => showFormulaHints(null, null));
document.addEventListener('selectionchange', inspectEditor);
function cancel() {
  if (busy) return;
  closeInlineEditor(); editor(); state(); error(null); cells.get(selected).focus();
}
$('cancel').addEventListener('click', cancel);
$('cell-input').addEventListener('keydown', event => { if (event.key === 'Escape' && !event.isComposing && event.keyCode !== 229) { event.preventDefault(); cancel(); } });
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
render();
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
