import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTRACT, LIMITS, executeWorkbook, prepareCommand, applyPrepared, calculate, encodeSnapshot, decodeSnapshot, sampleCells } from '../sheets/core.mjs';
import { parseInput, inputOf } from '../sheets/dist/schema.mjs';
let seq = 0;
const command = (operation, revision, payload, operationId = `op_${++seq}`) => ({ contract: CONTRACT, operationId, operation, expectedRevision: revision, payload });
const create = cells => executeWorkbook(null, command('create', 0, { workbookId: 'book_1', sheetId: 'sheet_1', name: 'Local workbook', cells: cells ?? sampleCells() }));
const change = (book, changes, id) => command('setCells', book.revision, { workbookId: book.workbookId, sheetId: book.sheetId, changes }, id);
const cell = value => parseInput(String(value));

test('line-item fixture recalculates 80 to 130 without changing the source snapshot', async () => {
  const { workbook } = await create();
  assert.equal(calculate(workbook).D4.value, 80);
  const next = await executeWorkbook(workbook, change(workbook, [{ address: 'B2', cell: cell(4) }]));
  assert.equal(calculate(next.workbook).D4.value, 130);
  assert.equal(calculate(workbook).D4.value, 80);
  assert.equal(next.workbook.revision, workbook.revision + 1);
  assert.equal(next.workbook.workbookId, workbook.workbookId);
});
test('grammar, precedence, unary signs, empty cells and explicit errors are deterministic', async () => {
  const { workbook } = await create({ A1: cell('=2+3*4'), A2: cell('=-(2+3)/2'), A3: cell('=SUM(B1:C2)'),
    A4: cell('=1/0'), A5: cell('=Q1'), A6: cell('=B3+1'), B3: cell('text'), A7: cell('=SUM(B1:B3)'),
    A8: cell('=globalThis.fetch()'), A9: cell('=1e308*10'), A10: cell('=TRUE'), A11: cell('=1+'), A12: cell('=A4+1') });
  const result = calculate(workbook);
  assert.equal(result.A1.value, 14); assert.equal(result.A2.value, -2.5); assert.equal(result.A3.value, 0);
  for (const [address, error] of [['A4','DIV_ZERO'],['A5','REFERENCE'],['A6','VALUE'],['A7','VALUE'],['A8','PARSE'],['A9','NUMBER'],['A10','PARSE'],['A11','PARSE'],['A12','DIV_ZERO']]) assert.equal(result[address].error, error);
});
test('cycles and their dependents expose errors without recursion failure', async () => {
  const { workbook } = await create({ A1: cell('=A2'), A2: cell('=A1'), A3: cell('=A1+2') });
  for (const result of Object.values(calculate(workbook))) assert.equal(result.error, 'CYCLE');
});
test('stale revisions, unknown fields, invalid cell coordinates/types and ID reuse fail closed', async () => {
  const { workbook } = await create();
  const edit = change(workbook, [{ address: 'A5', cell: cell(5) }], 'stable_operation');
  const first = await executeWorkbook(workbook, edit);
  const replay = await executeWorkbook(first.workbook, edit);
  assert.equal(replay.replayed, true); assert.deepEqual(replay.receipt, first.receipt);
  assert.equal(replay.workbook.revision, first.workbook.revision);
  await assert.rejects(executeWorkbook(first.workbook, { ...edit, payload: { ...edit.payload, changes: [{ address: 'A5', cell: cell(6) }] } }), { code: 'OPERATION_REUSE' });
  await assert.rejects(executeWorkbook(first.workbook, change(workbook, [{ address: 'A5', cell: null }], 'another')), { code: 'CONFLICT' });
  for (const changes of [[{ address: 'XFE1', cell: cell(1) }], [{ address: 'A1', cell: { type: 'number', value: Infinity } }], [{ address: 'A1', cell: cell(1) }, { address: 'A1', cell: null }]]) await assert.rejects(executeWorkbook(workbook, change(workbook, changes)));
  await assert.rejects(executeWorkbook(workbook, { ...change(workbook, [{ address: 'A1', cell: null }]), unexpected: true }), { code: 'INVALID' });
});
test('prepared commands capture private nested bytes before the caller can mutate them', async () => {
  const { workbook } = await create(); const input = change(workbook, [{ address: 'A5', cell: cell(3) }]);
  const pending = prepareCommand(input); input.payload.changes[0].cell.value = 9;
  const prepared = await pending;
  assert.equal(prepared.command, undefined);
  assert.equal(applyPrepared(workbook, prepared).workbook.cells.A5.value, 3);
});
test('snapshot decode rejects incompatible, non-JSON and over-limit input; restore is monotonic and clone is explicit', async () => {
  const { workbook } = await create();
  assert.equal(encodeSnapshot(decodeSnapshot(encodeSnapshot(workbook))), encodeSnapshot(workbook));
  assert.throws(() => decodeSnapshot('{'), { code: 'INVALID' });
  assert.throws(() => decodeSnapshot(JSON.stringify({ ...workbook, schemaVersion: 2 })), { code: 'VERSION' });
  assert.throws(() => decodeSnapshot(' '.repeat(LIMITS.bytes + 1)), { code: 'LIMIT' });
  const edited = (await executeWorkbook(workbook, change(workbook, [{ address: 'B2', cell: cell(4) }]))).workbook;
  const restored = (await executeWorkbook(edited, command('restore', edited.revision, { workbookId: edited.workbookId, snapshot: workbook, mode: 'replace' }))).workbook;
  assert.equal(restored.revision, edited.revision + 1); assert.equal(calculate(restored).D4.value, 80);
  assert.equal(restored.provenance.revision, workbook.revision);
  const payload = { workbookId: restored.workbookId, snapshot: workbook, mode: 'clone', newWorkbookId: 'cloned_book', newSheetId: 'cloned_sheet' };
  const cloned = (await executeWorkbook(restored, command('restore', restored.revision, payload))).workbook;
  assert.equal(cloned.revision, 1); assert.equal(cloned.workbookId, 'cloned_book');
  const initial = (await executeWorkbook(null, command('restore', 0, payload))).workbook;
  assert.equal(calculate(initial).D4.value, 80);
});
test('limits cover UTF-8, formula count, tokens, depth, dependencies and receipt eviction', async () => {
  const { workbook } = await create({});
  await assert.rejects(executeWorkbook(workbook, change(workbook, [{ address: 'A1', cell: { type:'text',value:'💚'.repeat(257) } }])), { code:'LIMIT' });
  await assert.rejects(create({ A1: cell('='.concat('1+'.repeat(65),'1')) }), { code:'LIMIT' });
  await assert.rejects(create({ A1: cell('='.concat('('.repeat(17),'1',')'.repeat(17))) }), { code:'LIMIT' });
  await assert.rejects(create({ A1: cell('=SUM(A1:P32)'), A2: cell('=B1') }), { code:'LIMIT' });
  const many = Object.fromEntries(Array.from({ length:65 },(_,i)=>[`${String.fromCharCode(65+i%16)}${Math.floor(i/16)+1}`,cell('=1')]));
  await assert.rejects(create(many), { code:'LIMIT' });
  let next = workbook;
  const expired = change(next,[{ address:'A1',cell:cell(0) }],'first'); next=(await executeWorkbook(next,expired)).workbook;
  for(let i=0;i<65;i++) next=(await executeWorkbook(next,change(next,[{ address:'A1',cell:cell(i) }]))).workbook;
  assert.equal(next.operations.length,64);
  await assert.rejects(executeWorkbook(next,expired),{ code:'CONFLICT' });
});
test('typed input round trips literal formulas, numeric-looking text and booleans', () => {
  for(const item of [{type:'text',value:'=A1'}, {type:'text',value:'001'}, {type:'text',value:'true'}, {type:'text',value:"'x"}, {type:'text',value:''},cell(true),cell(12),cell('name')]) assert.deepEqual(parseInput(inputOf(item)),item);
  assert.equal(parseInput(''),null);
});

test('the embedded public API returns accepted formula occurrences and canonical targets', async () => {
  const { extractFormulaReferences } = await import('@agentic-base/views-react/sheets');
  const input = '=$a$1 + SUM(B$2:$C3)';
  const refs = extractFormulaReferences(input);
  assert.deepEqual(refs.map(ref => [input.slice(ref.start, ref.end), ref.addresses]), [
    ['$a$1', ['A1']], ['B$2:$C3', ['B2', 'C2', 'B3', 'C3']],
  ]);
});
