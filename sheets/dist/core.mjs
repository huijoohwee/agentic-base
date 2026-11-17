import { CONTRACT, LIMITS, SheetsError, requireValue, keys, identifier, coordinate, canonical, validateCell, validateWorkbook, decodeSnapshot } from './schema.mjs';
import { calculate as calculateCells } from './formula.mjs';
export { CONTRACT, LIMITS, SheetsError, validateWorkbook, decodeSnapshot };
export function calculate(input) { return calculateCells(validateWorkbook(input)); }
export function encodeSnapshot(input) { return canonical(validateWorkbook(input)); }
const preparedCommands = new WeakMap();
export async function prepareCommand(input) {
  keys(input, ['contract', 'operationId', 'operation', 'expectedRevision', 'payload']);
  requireValue(input.contract === CONTRACT, 'VERSION', 'Unsupported command contract');
  identifier(input.operationId);
  requireValue(['create', 'setCells', 'restore'].includes(input.operation), 'INVALID', 'Unsupported operation');
  requireValue(Number.isSafeInteger(input.expectedRevision) && input.expectedRevision >= 0, 'INVALID_REVISION', 'Expected revision is required');
  const text = canonical(input), command = JSON.parse(text);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  const fingerprint = [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  const prepared = Object.freeze({ fingerprint });
  // The hashed request stays private, including nested cells and snapshot data.
  preparedCommands.set(prepared, command);
  return prepared;
}
function empty(payload) {
  keys(payload, ['workbookId', 'sheetId', 'name', 'cells'], ['workbookId', 'sheetId', 'name']);
  return { contract: CONTRACT, schemaVersion: 1, workbookId: identifier(payload.workbookId), sheetId: identifier(payload.sheetId),
    name: payload.name, revision: 1, rows: LIMITS.rows, columns: LIMITS.columns, cells: payload.cells ?? {}, operations: [] };
}
export function applyPrepared(currentInput, prepared) {
  requireValue(preparedCommands.has(prepared), 'INVALID', 'Command must be captured by prepareCommand');
  const command = preparedCommands.get(prepared), { fingerprint } = prepared;
  const { operationId, operation, expectedRevision, payload } = command;
  const current = currentInput ? validateWorkbook(currentInput) : null;
  const prior = current?.operations.find(entry => entry.operationId === operationId);
  if (prior) {
    requireValue(prior.fingerprint === fingerprint, 'OPERATION_REUSE', 'Operation ID already identifies another request');
    return { workbook: current, receipt: prior, replayed: true };
  }
  requireValue((current?.revision ?? 0) === expectedRevision, 'CONFLICT', 'Workbook changed; reload before writing');
  let next;
  if (operation === 'create') {
    requireValue(!current, 'CONFLICT', 'A workbook already exists; use explicit restore or clone');
    next = empty(payload);
  } else {
    requireValue(current || operation === 'restore', 'CONFLICT', 'Create or import a workbook first');
    if (current) {
      requireValue(payload.workbookId === current.workbookId, 'CONFLICT', 'Workbook identity changed');
      requireValue(current.revision < Number.MAX_SAFE_INTEGER, 'LIMIT', 'Revision limit reached');
      next = structuredClone(current); next.revision++;
    }
    if (operation === 'setCells') {
      keys(payload, ['workbookId', 'sheetId', 'changes']);
      requireValue(payload.sheetId === current.sheetId, 'CONFLICT', 'Worksheet identity changed');
      requireValue(Array.isArray(payload.changes) && payload.changes.length > 0 && payload.changes.length <= 512, 'LIMIT', 'Expected 1–512 changes');
      const seen = new Set();
      for (const change of payload.changes) {
        keys(change, ['address', 'cell']); coordinate(change.address);
        requireValue(!seen.has(change.address), 'INVALID', 'Duplicate edited cell'); seen.add(change.address);
        if (change.cell === null) delete next.cells[change.address];
        else next.cells[change.address] = validateCell(change.cell);
      }
    } else {
      keys(payload, ['workbookId', 'snapshot', 'mode', 'newWorkbookId', 'newSheetId'], ['workbookId', 'snapshot', 'mode']);
      const imported = validateWorkbook(payload.snapshot);
      requireValue(['replace', 'clone'].includes(payload.mode), 'INVALID', 'Choose restore current or replace with an imported clone');
      if (payload.mode === 'replace') requireValue(current && imported.workbookId === current.workbookId, 'CONFLICT', 'A different identity requires explicit clone');
      if (!current) requireValue(payload.workbookId === imported.workbookId, 'CONFLICT', 'Imported workbook identity changed');
      next = { ...imported, revision: (current?.revision ?? 0) + 1, operations: current?.operations ?? [],
        provenance: { workbookId: imported.workbookId, sheetId: imported.sheetId, revision: imported.revision } };
      if (payload.mode === 'clone') {
        next.workbookId = identifier(payload.newWorkbookId); next.sheetId = identifier(payload.newSheetId); next.revision = 1;
        requireValue(next.workbookId !== current?.workbookId && next.workbookId !== imported.workbookId, 'INVALID_ID', 'Clone needs a new workbook identity');
      } else requireValue(payload.newWorkbookId === undefined && payload.newSheetId === undefined, 'INVALID', 'Restore does not accept new identities');
    }
  }
  const receipt = { operationId, fingerprint, workbookId: next.workbookId, revision: next.revision };
  next.operations = [...(current?.operations ?? []), receipt].slice(-LIMITS.operations);
  next = validateWorkbook(next); calculateCells(next);
  return { workbook: next, receipt: next.operations.at(-1), replayed: false };
}
export async function executeWorkbook(current, command) { return applyPrepared(current, await prepareCommand(command)); }
export function sampleCells() {
  const t = value => ({ type: 'text', value }), n = value => ({ type: 'number', value }), f = value => ({ type: 'formula', value });
  return { A1: t('Item'), B1: t('Quantity'), C1: t('Unit price'), D1: t('Amount'),
    A2: t('Seats'), B2: n(2), C2: n(25), D2: f('=B2*C2'), A3: t('Support'), B3: n(3), C3: n(10), D3: f('=B3*C3'), A4: t('Total'), D4: f('=SUM(D2:D3)') };
}
