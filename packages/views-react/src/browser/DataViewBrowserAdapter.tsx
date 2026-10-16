import React from 'react'
import { createRoot } from 'react-dom/client'
import { DataTableCore, type DataTableField, type DataTableRecord } from '../table/DataTableCore'

export const DATA_VIEW_BROWSER_LIMITS = Object.freeze({
  columns: 64,
  rows: 1000,
  cellChars: 4096,
  idChars: 128,
  labelChars: 256,
  payloadBytes: 196608,
})

export type DataViewBrowserState = {
  columns: readonly { id: string; name: string }[]
  rows: readonly { id: string; cells: readonly string[] }[]
  selectedRowId?: string | null
  onActivateRow?: (rowId: string) => void
  orientation?: 'rows' | 'columns'
  ariaLabel?: string
}
export type DataViewBrowserHandle = { update: (next: DataViewBrowserState) => void; destroy: () => void }

const mountedTargets = new WeakSet<HTMLElement>()
const INITIAL_ROWS = 32
const ROW_INCREMENT = 32

function snapshot(input: DataViewBrowserState): DataViewBrowserState {
  if (!input || typeof input !== 'object') throw new TypeError('Data view state must be an object.')
  const string = (value: unknown, max: number, label: string, nonempty = false): string => {
    if (typeof value !== 'string' || value.length > max || (nonempty && !value.trim()) || value.includes('\u0000')) {
      throw new TypeError(`Invalid data view ${label}.`)
    }
    return value
  }
  const limits = DATA_VIEW_BROWSER_LIMITS
  if (!Array.isArray(input.columns) || !input.columns.length || input.columns.length > limits.columns) throw new RangeError('Data view column limit exceeded.')
  if (!Array.isArray(input.rows) || input.rows.length > limits.rows) throw new RangeError('Data view row limit exceeded.')
  const fieldIds = new Set<string>()
  const recordIds = new Set<string>()
  let characters = 0
  const bounded = (value: string) => {
    characters += value.length
    if (characters > limits.payloadBytes) throw new RangeError('Data view payload limit exceeded.')
    return value
  }
  const columns = (input.columns as DataViewBrowserState['columns']).map(column => {
    const id = bounded(string(column?.id, limits.idChars, 'column ID', true))
    if (fieldIds.has(id)) throw new TypeError('Duplicate data view column ID.')
    fieldIds.add(id)
    return { id, name: bounded(string(column?.name, limits.labelChars, 'column name', true)) }
  })
  const rows = (input.rows as DataViewBrowserState['rows']).map(row => {
    const id = bounded(string(row?.id, limits.idChars, 'row ID', true))
    if (recordIds.has(id)) throw new TypeError('Duplicate data view row ID.')
    recordIds.add(id)
    if (!Array.isArray(row?.cells) || row.cells.length !== columns.length) throw new TypeError('Data view cells must match columns.')
    return { id, cells: row.cells.map(cell => bounded(string(cell, limits.cellChars, 'cell'))) }
  })
  const orientation = input.orientation ?? 'rows'
  if (orientation !== 'rows' && orientation !== 'columns') throw new TypeError('Invalid data view orientation.')
  const ariaLabel = string(input.ariaLabel ?? 'Table view', limits.labelChars, 'label', true)
  const selectedRowId = input.selectedRowId == null ? input.selectedRowId : string(input.selectedRowId, limits.idChars, 'selection', true)
  if (selectedRowId != null && !recordIds.has(selectedRowId)) throw new TypeError('Selected data view record does not exist.')
  if (input.onActivateRow !== undefined && typeof input.onActivateRow !== 'function') throw new TypeError('Invalid data view activation callback.')
  const state = { columns, rows, orientation, ariaLabel, selectedRowId }
  if (new TextEncoder().encode(JSON.stringify(state)).byteLength > limits.payloadBytes) throw new RangeError('Data view payload limit exceeded.')
  return { ...state, onActivateRow: input.onActivateRow }
}

function BrowserDataView({ state }: { state: DataViewBrowserState }) {
  const [rowLimit, setRowLimit] = React.useState(INITIAL_ROWS)
  const records = (state.rows ?? []).slice(0, rowLimit) as DataTableRecord[]
  const fields = state.columns.map(column => ({ id: column.id, label: column.name })) as DataTableField[]
  const remaining = state.rows.length - records.length
  return <DataTableCore
    fields={fields}
    records={records}
    orientation={state.orientation ?? 'rows'}
    selectedRowId={state.selectedRowId}
    onActivateRow={state.onActivateRow}
    ariaLabel={state.ariaLabel ?? 'Table view'}
    afterRows={remaining > 0 ? <tr><td colSpan={Math.max(1, state.columns.length)}><button className="agentic-base-data-more" type="button" onClick={() => setRowLimit(limit => Math.min(state.rows.length, limit + ROW_INCREMENT))}>Show {Math.min(remaining, ROW_INCREMENT)} more records</button></td></tr> : null}
  />
}

/** Mount one bounded, offline table surface into a consumer-owned element. Cells are always text. */
export function mountDataView(target: HTMLElement, initial: DataViewBrowserState): DataViewBrowserHandle {
  const state = snapshot(initial)
  const ElementClass = target?.ownerDocument?.defaultView?.HTMLElement
  if (!ElementClass || !(target instanceof ElementClass)) throw new TypeError('Data view target must be an HTML element.')
  if (mountedTargets.has(target)) throw new Error('Data view target is already mounted.')
  const root = createRoot(target)
  mountedTargets.add(target)
  let destroyed = false
  const render = (next: DataViewBrowserState) => root.render(<BrowserDataView key={`${next.orientation ?? 'rows'}:${next.rows.map(row => row.id).join('\u0000')}`} state={next} />)
  render(state)
  return {
    update(next) {
      if (destroyed) throw new Error('Data view is destroyed.')
      render(snapshot(next))
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      root.unmount()
      mountedTargets.delete(target)
    },
  }
}
