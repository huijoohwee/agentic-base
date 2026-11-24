import { createRecordFieldIndex, fieldValue } from './record-fields.mjs';
import { createRecordLinkCodec } from './record-links.mjs';
import { mountRecordFieldEditor, mountRecordPicker } from './record-field-controls.mjs';

const pageSize = 12;
function el(tag, text) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}
function button(text, click) {
  const node = el('button', text);
  node.type = 'button'; node.className = 'secondary'; node.onclick = click;
  return node;
}

export async function mountLinkedWorkspace(host, { execute, baseId, initialTable, editField, onClose, mountDataView, fragment = 'records' }) {
  const codec = createRecordLinkCodec({ fragment, views: [{ view: 'table', group: 'table', record: 'row', requireGroup: true }] });
  const prefix = '#' + encodeURIComponent(fragment) + '?';
  const destination = (group, record) => codec.href({ view: 'table', group, record });

  const heading = el('h2', 'Linked records'), toolbar = el('div'), status = el('p'), hostTable = el('div');
  const detail = el('section'), editor = el('div');
  const select = el('select'), label = el('label', 'Table '), range = el('span');
  const previous = button('Previous records', () => { offset -= pageSize; render(); });
  const next = button('Next records', () => { offset += pageSize; render(); });
  label.append(select);
  const add = button('New link field', () => edit({ id: crypto.randomUUID(), name: '', type: 'recordLink' }));
  toolbar.className = 'agentic-record-actions'; hostTable.className = 'agentic-record-table';
  status.setAttribute('role', 'status'); detail.setAttribute('aria-label', 'Record relationships');
  toolbar.append(label, add, previous, range, next, button('Close linked records', onClose));
  host.replaceChildren(heading, toolbar, status, hostTable, detail, editor);
  let tables, records, revision, index, activeTable, rowId, view, offset = 0, ticket = 0, stopped = false;
  function table() { return tables.find(t => t.id === activeTable); }
  function row(tableId, id) { return records.get(tableId)?.get(id); }
  function navigate(tableId, recordId) {
    const hash = destination(tableId, recordId);
    if (location.hash === hash) resolveLocation();
    else location.hash = hash;
  }
  select.onchange = () => navigate(select.value);
  function resolveLocation() {
    const dest = codec.parse(location.hash);
    const target = dest?.group ?? initialTable;
    if ((location.hash.startsWith(prefix) && !dest) || !records.has(target) || (dest?.record && !row(target, dest.record))) {
      status.textContent = 'The bookmarked table or record is unavailable.';
      rowId = undefined; activeTable = records.has(target) ? target : initialTable; offset = 0; render(); return;
    }
    status.textContent = '';
    activeTable = target; rowId = dest?.record;
    const ids = [...records.get(target).keys()];
    offset = rowId ? Math.floor(ids.indexOf(rowId) / pageSize) * pageSize : 0;
    render(Boolean(rowId));
  }
  function relationAnchor(entry, text) {
    const a = el('a', text);
    a.href = destination(entry.tableId, entry.recordId);
    return a;
  }
  function renderDetail() {
    detail.replaceChildren();
    const current = row(activeTable, rowId);
    if (!current) return;
    const { outgoing, incoming } = index.related(activeTable, rowId);
    for (const field of table().fields.filter(f => f.type === 'recordLink')) {
      const group = el('section'); group.append(el('h3', field.name));
      for (const entry of outgoing.filter(e => e.fieldId === field.id)) group.append(relationAnchor(entry, entry.label), ' ');
      group.append(button('Choose ' + field.name, () => {
        const expectedRevision = revision, tableId = activeTable;
        mountRecordPicker(editor, { field, tableId, target: tables.find(t => t.id === field.link.targetTableId),
          index, value: fieldValue(current, field.id) ?? [], onCancel: () => editor.replaceChildren(),
          onSave: async ids => {
            await execute('record.update', { baseId, tableId, recordId: current.id, expectedRevision,
              expectedRecordRevision: current.revision, values: { ...current.values, [field.id]: ids } });
            await refresh();
          } });
      }));
      detail.append(group);
    }
    if (incoming.length) {
      const group = el('section'); group.append(el('h3', 'Linked from'));
      for (const edge of incoming) {
        const source = tables.find(t => t.id === edge.tableId);
        const title = source.fields.find(f => f.type === 'text');
        const field = source.fields.find(f => f.id === edge.fieldId);
        const name = title && fieldValue(row(edge.tableId, edge.recordId), title.id) || edge.recordId;
        group.append(relationAnchor(edge, source.name + ' · ' + field.name + ' · ' + name), ' ');
      }
      detail.append(group);
    }
  }
  function edit(field) {
    const tableId = activeTable, expectedRevision = revision;
    mountRecordFieldEditor(editor, { tables, tableId, field, onCancel: () => editor.replaceChildren(),
      onSave: async updated => { await execute('field.set', { baseId, tableId, expectedRevision, field: updated }); await refresh(); } });
  }
  function render(focus = false) {
    select.value = activeTable; editor.replaceChildren();
    const fields = table().fields, all = [...records.get(activeTable).values()];
    const page = all.slice(offset, offset + pageSize);
    const data = { ariaLabel: table().name + ' records', columns: fields.map(f => ({ id: f.id, name: f.name })),
      rows: page.map(item => {
        const links = index.related(activeTable, item.id).outgoing;
        return { id: item.id, cells: fields.map(f => f.type === 'recordLink'
          ? links.filter(e => e.fieldId === f.id).map(e => e.label).join(', ') : String(fieldValue(item, f.id) ?? '')) };
      }), selectedRowId: page.some(r => r.id === rowId) ? rowId : null, revealSelection: focus,
      onActivateRow: id => navigate(activeTable, id), onEditField: id => edit(fields.find(f => f.id === id)) };
    if (view) view.update(data); else view = mountDataView(hostTable, data);
    range.textContent = page.length ? (offset + 1) + '–' + (offset + page.length) + ' of ' + all.length : 'No records';
    previous.disabled = !offset; next.disabled = offset + pageSize >= all.length;
    renderDetail();
  }
  async function refresh() {
    const current = ++ticket;
    const version = (await execute('base.get', { baseId })).revision;
    const schema = await execute('table.list', { baseId }), collections = new Map(), flat = [];
    for (const t of schema) {
      const byId = new Map();
      let offset = 0;
      do {
        const page = await execute('record.list', { baseId, tableId: t.id, limit: pageSize, offset });
        if (page.revision !== version) throw new Error('The base changed while loading. Reopen linked records to reload.');
        for (const item of page.items) { byId.set(item.id, item); flat.push(item); }
        offset = page.nextOffset;
      } while (offset !== null);
      collections.set(t.id, byId);
    }
    if (current !== ticket || stopped) return;
    index = createRecordFieldIndex(schema, flat);
    revision = version; tables = schema; records = collections;
    select.replaceChildren(...tables.map(t => new Option(t.name, t.id)));
    resolveLocation();
  }
  await refresh();
  const initialField = table().fields.find(f => f.id === editField);
  if (initialField) edit(initialField);
  function onHash() {
    if (!location.hash.startsWith(prefix)) { onClose(); return; }
    resolveLocation();
  }
  window.addEventListener('hashchange', onHash);
  return () => { stopped = true; window.removeEventListener('hashchange', onHash); view?.destroy(); host.replaceChildren(); };
}
