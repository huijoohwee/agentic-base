import { columnLabel, coordinate } from './schema.mjs';

const columns = [
  { id: 'address', name: 'Cell' }, { id: 'column', name: 'Column', kind: 'select' },
  { id: 'kind', name: 'Cell type', kind: 'select' }, { id: 'value', name: 'Calculated value' },
];
const pageSize = 24;
export function projectCells(cells, results) {
  return Object.keys(cells).map(address => ({ address, ...coordinate(address) }))
    .sort((a, b) => a.row - b.row || a.column - b.column)
    .map(({ address, column }) => {
      const result = results[address], value = String(result?.error ? result.display : result?.value ?? '');
      return { id: address, cells: [address, columnLabel(column), cells[address].type, value.replaceAll('\u0000', '␀')] };
    });
}

export async function mountCellRecords(host, activate) {
  const { createRecordRelation, mountDataView, mountRecordViewToolbar } = await import('./browser-data-view.js');
  const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = new URL('./browser-data-view.css', import.meta.url).href;
  const controls = document.createElement('div'), content = document.createElement('div');
  const ready = new Promise((resolve, reject) => {
    css.onload = resolve; css.onerror = () => reject(new Error('Workbook record styles could not load.'));
  });
  const references = document.createElement('nav');
  references.setAttribute('aria-label', 'Cell references');
  root.replaceChildren(css, controls, content, references);
  await ready;
  let layout = 'table', orientation = 'rows', offset = 0, rows = [], table, toolbar;
  let relation, addresses, selected;
  function renderReferences() {
    references.replaceChildren();
    if (!addresses.has(selected)) return;
    function add(label, related) {
      if (!related.length) return;
      const group = document.createElement('p');
      group.append(label + ' ' + selected + ' ');
      for (const address of related) {
        const button = document.createElement('button');
        button.type = 'button'; button.textContent = address;
        button.addEventListener('click', () => activate(address));
        group.append(button, ' ');
      }
      references.append(group);
    }
    add('Inputs to', relation.from(selected).map(edge => edge.target));
    add('Formulas using', relation.to(selected).map(edge => edge.source));
  }
  const theme = matchMedia('(prefers-color-scheme: dark)');
  function applyTheme() {
    if (theme.matches) host.dataset.darkVariant = 'black'; else delete host.dataset.darkVariant;
  }
  applyTheme(); theme.addEventListener('change', applyTheme);
  function render() {
    const page = rows.slice(offset, offset + pageSize);
    const tools = { label: 'Worksheet record views', layout,
      status: page.length ? (offset + 1) + '–' + (offset + page.length) + ' of ' + rows.length + ' cells' : 'No populated cells',
      actions: [{ id: 'previous', label: 'Previous cells', disabled: !offset, invoke() { offset -= pageSize; render(); } },
        { id: 'next', label: 'Next cells', disabled: offset + page.length >= rows.length, invoke() { offset += pageSize; render(); } }],
      onLayoutChange(value) { layout = value; render(); } };
    if (toolbar) toolbar.update(tools); else toolbar = mountRecordViewToolbar(controls, tools);
    if (!page.length) { table?.destroy(); table = undefined; return; }
    const view = { columns, rows: page, layout, selectedRowId: page.some(row => row.id === selected) ? selected : null, ariaLabel: 'Populated worksheet cells', onActivateRow: activate,
      ...(layout === 'kanban' ? { groupByColumnId: 'kind' } : {}),
      ...(layout === 'multiDimensional' ? { orientation, onOrientationChange(value) { orientation = value; render(); } } : {}) };
    if (table) table.update(view); else table = mountDataView(content, view);
  }
  function select(address) {
    const index = rows.findIndex(row => row.id === address);
    if (index >= 0 && selected !== address) offset = Math.floor(index / pageSize) * pageSize;
    selected = address;
    render(); renderReferences();
  }
  return { select, update(cells, results, links, address) {
    rows = projectCells(cells, results);
    addresses = new Set([...Object.keys(cells), ...links.map(edge => edge.target)]);
    relation = createRecordRelation({ sources: addresses, targets: addresses, links });
    offset = Math.min(offset, Math.max(0, Math.floor((rows.length - 1) / pageSize) * pageSize));
    select(address);
  } };
}
