import { LIMITS, SheetsError, coordinate, addressOf, requireValue } from './schema.mjs';
class FormulaError extends Error { constructor(code) { super(code); this.code = code; } }
const problem = code => { throw new FormulaError(code); };
const errors = { PARSE: '#PARSE!', REFERENCE: '#REF!', VALUE: '#VALUE!', DIV_ZERO: '#DIV/0!', CYCLE: '#CYCLE!', NUMBER: '#NUM!' };
export function compileFormula(source) {
  const text = source.slice(1).toUpperCase(), tokens = [];
  let offset = 0, index = 0;
  const dependencies = new Set();
  while (offset < text.length) {
    if (/\s/.test(text[offset])) { offset++; continue; }
    const token = /^(?:\d+\.?\d*|\.\d+)(?:E[+-]?\d+)?|^[A-Z]+[0-9]+|^SUM\b|^[+*/():,-]/.exec(text.slice(offset));
    if (!token) problem('PARSE');
    tokens.push(token[0]); offset += token[0].length;
    requireValue(tokens.length <= LIMITS.tokens, 'LIMIT', 'Formula token limit exceeded');
  }
  const ref = token => {
    try { coordinate(token); } catch { problem('REFERENCE'); }
    dependencies.add(token);
    return { kind: 'ref', address: token };
  };
  const take = token => { if (tokens[index++] !== token) problem('PARSE'); };
  function atom(depth) {
    requireValue(depth <= LIMITS.depth, 'LIMIT', 'Formula nesting limit exceeded');
    const token = tokens[index++];
    if (token === '(') { const node = expression(depth + 1); take(')'); return node; }
    if (token === 'SUM') {
      take('(');
      const start = ref(tokens[index++]); take(':'); const end = ref(tokens[index++]); take(')');
      const a = coordinate(start.address), b = coordinate(end.address), items = [];
      if (a.row > b.row || a.column > b.column) problem('REFERENCE');
      for (let row = a.row; row <= b.row; row++) for (let column = a.column; column <= b.column; column++) items.push(ref(addressOf(row, column)));
      return { kind: 'sum', items };
    }
    if (token && /^[A-Z]+[0-9]+$/.test(token)) return ref(token);
    if (token && /^(?:\d|\.)/.test(token)) {
      const value = Number(token); if (!Number.isFinite(value)) problem('NUMBER');
      return { kind: 'number', value };
    }
    problem('PARSE');
  }
  function unary(depth) {
    requireValue(depth <= LIMITS.depth, 'LIMIT', 'Formula nesting limit exceeded');
    if (tokens[index] === '+' || tokens[index] === '-') return { kind: 'unary', op: tokens[index++], node: unary(depth + 1) };
    return atom(depth);
  }
  function term(depth) {
    let left = unary(depth);
    while (tokens[index] === '*' || tokens[index] === '/') left = { kind: 'binary', op: tokens[index++], left, right: unary(depth) };
    return left;
  }
  function expression(depth) {
    let left = term(depth);
    while (tokens[index] === '+' || tokens[index] === '-') left = { kind: 'binary', op: tokens[index++], left, right: term(depth) };
    return left;
  }
  const node = expression(0);
  if (index !== tokens.length) problem('PARSE');
  return { node, dependencies };
}
export function calculate(workbook) {
  const compiled = new Map(), results = {}, visiting = new Set();
  let edges = 0, steps = 0;
  for (const [address, cell] of Object.entries(workbook.cells)) {
    if (cell.type !== 'formula') continue;
    try {
      const code = compileFormula(cell.value); compiled.set(address, code);
      edges += code.dependencies.size;
      requireValue(edges <= LIMITS.edges, 'LIMIT', 'Workbook dependency limit exceeded');
    } catch (error) {
      if (error instanceof SheetsError) throw error;
      if (!(error instanceof FormulaError)) throw error;
      compiled.set(address, { error: error.code });
    }
  }
  const step = () => requireValue(++steps <= LIMITS.steps, 'LIMIT', 'Calculation operation limit exceeded');
  function numeric(address) {
    const result = cellResult(address);
    if (result.error) problem(result.error);
    if (result.value === null) return 0;
    if (typeof result.value !== 'number') problem('VALUE');
    return result.value;
  }
  function evaluate(node) {
    step();
    if (node.kind === 'number') return node.value;
    if (node.kind === 'ref') return numeric(node.address);
    if (node.kind === 'unary') return node.op === '-' ? -evaluate(node.node) : evaluate(node.node);
    if (node.kind === 'sum') return node.items.reduce((sum, item) => sum + evaluate(item), 0);
    const left = evaluate(node.left), right = evaluate(node.right);
    if (node.op === '/' && right === 0) problem('DIV_ZERO');
    return node.op === '+' ? left + right : node.op === '-' ? left - right : node.op === '*' ? left * right : left / right;
  }
  function cellResult(address) {
    if (Object.hasOwn(results, address)) return results[address];
    if (visiting.has(address)) problem('CYCLE');
    const cell = workbook.cells[address];
    if (!cell || cell.type !== 'formula') return { value: cell?.value ?? null };
    visiting.add(address);
    let result;
    try {
      const code = compiled.get(address);
      if (code.error) problem(code.error);
      const value = evaluate(code.node);
      if (!Number.isFinite(value)) problem('NUMBER');
      result = { value };
    } catch (error) {
      if (!(error instanceof FormulaError)) throw error;
      result = { value: null, error: error.code, display: errors[error.code] };
    } finally { visiting.delete(address); }
    results[address] = result;
    return result;
  }
  for (const address of Object.keys(workbook.cells).sort()) results[address] = cellResult(address);
  return results;
}
