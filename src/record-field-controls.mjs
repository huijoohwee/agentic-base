function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function labeled(form, text, control) {
  const label = element('label', text);
  label.append(control);
  form.append(label);
  return control;
}

function options(select, entries, preferred) {
  select.replaceChildren(...entries.map(({ id, name }) => new Option(name, id)));
  if (entries.some(item => item.id === preferred)) select.value = preferred;
}

function actions(form, onSave, onCancel) {
  const save = element('button', 'Save', 'primary'), cancel = element('button', 'Cancel', 'secondary');
  const status = element('p');
  status.setAttribute('role', 'alert');
  save.type = 'submit'; cancel.type = 'button';
  cancel.onclick = onCancel;
  form.append(save, cancel, status);
  form.onsubmit = async event => {
    event.preventDefault();
    if (save.disabled) return;
    save.disabled = cancel.disabled = true;
    try { await onSave(); }
    catch (error) { status.textContent = error.message; }
    finally { save.disabled = cancel.disabled = false; }
  };
}

/** Edit one field definition. Persistence and revision checks belong to the caller. */
export function mountRecordFieldEditor(host, { tables, tableId, field, onSave, onCancel }) {
  const form = element('form', undefined, 'agentic-record-form agentic-form-controls');
  form.setAttribute('aria-label', 'Edit field');
  const name = labeled(form, 'Field name', element('input'));
  name.required = true; name.maxLength = 160; name.value = field.name;
  const type = labeled(form, 'Field type', element('select'));
  options(type, [...(field.type === 'recordLink' ? [] : [{ id: field.type, name: field.type }]),
    { id: 'recordLink', name: 'Record link' }], field.type);
  const settings = element('fieldset');
  settings.append(element('legend', 'Record link'));
  const target = labeled(settings, 'Target table', element('select'));
  const display = labeled(settings, 'Display field', element('select'));
  const supporting = element('fieldset');
  settings.append(supporting);
  const multiple = labeled(settings, 'Allow linking multiple records', element('input'));
  multiple.type = 'checkbox'; multiple.checked = field.link?.multiple ?? false;
  form.append(settings);
  options(target, tables.filter(t => t.fields.some(f => f.type !== 'recordLink' && !(t.id === tableId && f.id === field.id))),
    field.link?.targetTableId ?? tableId);
  function columns() {
    return tables.find(t => t.id === target.value)?.fields.filter(f => f.type !== 'recordLink' && !(target.value === tableId && f.id === field.id)) ?? [];
  }
  function renderSupporting(selected) {
    supporting.replaceChildren(element('legend', 'Supporting fields in picker'));
    for (const column of columns().filter(f => f.id !== display.value)) {
      const control = labeled(supporting, column.name, element('input'));
      control.type = 'checkbox'; control.value = column.id; control.checked = selected.includes(column.id);
    }
  }
  function changeTarget() {
    const original = target.value === field.link?.targetTableId;
    options(display, columns(), original ? field.link.displayFieldId : undefined);
    renderSupporting(original ? field.link.supportingFieldIds : []);
  }
  const selected = () => Array.from(supporting.querySelectorAll('input:checked'), input => input.value);
  display.onchange = () => renderSupporting(selected());
  target.onchange = changeTarget;
  function changeType() {
    settings.hidden = settings.disabled = type.value !== 'recordLink';
    target.required = display.required = !settings.hidden;
  }
  type.onchange = changeType; changeType(); changeTarget();
  actions(form, () => {
    const next = { ...field, name: name.value.trim(), type: type.value };
    if (next.type === 'recordLink') {
      delete next.options;
      next.link = { targetTableId: target.value, displayFieldId: display.value, supportingFieldIds: selected(), multiple: multiple.checked };
    }
    return onSave(next);
  }, onCancel);
  host.replaceChildren(form); name.focus();
}

/** Search target labels and supporting fields while retaining selections across pages and queries. */
export function mountRecordPicker(host, { field, target, index, tableId, value = [], onSave, onCancel }) {
  const form = element('form', undefined, 'agentic-record-picker agentic-form-controls');
  form.setAttribute('aria-label', 'Choose linked records');
  const search = labeled(form, 'Search ' + target.name, element('input'));
  search.type = 'search';
  const list = element('fieldset'), status = element('p'), controls = element('div');
  const previous = element('button', 'Previous'), next = element('button', 'Next');
  previous.type = next.type = 'button';
  controls.append(previous, next); form.append(list, status, controls);
  const selected = new Set(value);
  let offset = 0;
  const size = 20;
  const names = new Map(target.fields.map(f => [f.id, f.name]));
  function render() {
    const rows = index.choices(tableId, field.id, search.value);
    list.replaceChildren(element('legend', field.name));
    for (const row of rows.slice(offset, offset + size)) {
      const extra = row.supporting.filter(cell => cell.value !== null).map(cell => names.get(cell.fieldId) + ' · ' + cell.value);
      const input = labeled(list, [row.label, ...extra].join(' — '), element('input'));
      input.type = 'checkbox'; input.value = row.id; input.checked = selected.has(row.id);
      input.onchange = () => {
        if (!field.link.multiple) {
          selected.clear();
          for (const other of list.querySelectorAll('input')) if (other !== input) other.checked = false;
        }
        if (input.checked) selected.add(row.id); else selected.delete(row.id);
        status.textContent = rows.length + ' matching · ' + selected.size + ' selected';
      };
    }
    status.textContent = rows.length + ' matching · ' + selected.size + ' selected';
    previous.disabled = offset === 0; next.disabled = offset + size >= rows.length;
  }
  previous.onclick = () => { offset -= size; render(); };
  next.onclick = () => { offset += size; render(); };
  search.oninput = () => { offset = 0; render(); };
  actions(form, () => onSave([...selected]), onCancel);
  host.replaceChildren(form); render(); search.focus();
}
