import React from 'react'
import { createRoot } from 'react-dom/client'
import { TableHostProvider } from '../table/TableHostContext'
import { TableView } from '../table/TableView'
import { createBaseTableHost } from '../table/BaseTableHost'
import type { ViewColumnKind, ViewModel } from '../kanban/KanbanHostContext'

export const DATA_VIEW_BROWSER_LIMITS = Object.freeze({
  columns: 64,
  rows: 1000,
  cellChars: 4096,
  idChars: 128,
  labelChars: 256,
  payloadBytes: 196608,
})

export type DataViewBrowserState = {
  columns: readonly { id: string; name: string; kind?: ViewColumnKind }[]
  rows: readonly { id: string; cells: readonly string[]; depth?: number }[]
  selectedRowId?: string | null
  selectedRowIds?: readonly string[]
  onActivateRow?: (rowId: string) => void
  onDeselectRow?: (rowId: string) => void
  onSelectionChange?: (selectedRowIds: string[]) => void
  orientation?: 'rows' | 'columns'
  ariaLabel?: string
}
export type DataViewBrowserHandle = { update: (next: DataViewBrowserState) => void; destroy: () => void }

const mountedTargets = new WeakSet<HTMLElement>()
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
    const kind = column?.kind ?? 'text'
    if (kind !== 'text' && kind !== 'select' && kind !== 'multi-select') throw new TypeError('Invalid data view column kind.')
    return { id, name: bounded(string(column?.name, limits.labelChars, 'column name', true)), kind }
  })
  const rows = (input.rows as DataViewBrowserState['rows']).map(row => {
    const id = bounded(string(row?.id, limits.idChars, 'row ID', true))
    if (recordIds.has(id)) throw new TypeError('Duplicate data view row ID.')
    recordIds.add(id)
    if (!Array.isArray(row?.cells) || row.cells.length !== columns.length) throw new TypeError('Data view cells must match columns.')
    const depth = row.depth
    if (depth !== undefined && (!Number.isInteger(depth) || depth < 1 || depth > 8)) throw new RangeError('Invalid data view row depth.')
    return { id, cells: row.cells.map(cell => bounded(string(cell, limits.cellChars, 'cell'))), ...(depth === undefined ? {} : { depth }) }
  })
  const rowDepths = rows.flatMap(row => row.depth === undefined ? [] : [row.depth])
  if (rowDepths.length && rowDepths[0] !== 1) throw new RangeError('The first hierarchical data view row must start at depth 1.')
  if (rowDepths.some((depth, index) => index > 0 && depth > rowDepths[index - 1]! + 1)) {
    throw new RangeError('Data view row depth cannot skip a hierarchy level.')
  }
  if (rowDepths.length && fieldIds.has('__agentic_base_level')) throw new TypeError('Data view column ID is reserved for hierarchy state.')
  const orientation = input.orientation ?? 'rows'
  if (orientation !== 'rows' && orientation !== 'columns') throw new TypeError('Invalid data view orientation.')
  const ariaLabel = string(input.ariaLabel ?? 'Table view', limits.labelChars, 'label', true)
  const selectedRowId = input.selectedRowId == null ? input.selectedRowId : string(input.selectedRowId, limits.idChars, 'selection', true)
  if (selectedRowId != null && !recordIds.has(selectedRowId)) throw new TypeError('Selected data view record does not exist.')
  if ((input.selectedRowIds === undefined) !== (input.onSelectionChange === undefined)) throw new TypeError('Row selection IDs and callback must be provided together.')
  if (input.onSelectionChange !== undefined && typeof input.onSelectionChange !== 'function') throw new TypeError('Invalid data view selection callback.')
  if (input.selectedRowIds !== undefined && !Array.isArray(input.selectedRowIds)) throw new TypeError('Row selection IDs must be an array.')
  const selectedRowIds = input.selectedRowIds?.map(rowId => string(rowId, limits.idChars, 'selection', true))
  if (selectedRowIds) {
    const selectedIds = new Set<string>()
    for (const rowId of selectedRowIds) {
      if (!recordIds.has(rowId)) throw new TypeError('Selected data view record does not exist.')
      if (selectedIds.has(rowId)) throw new TypeError('Duplicate selected data view record.')
      selectedIds.add(rowId)
    }
  }
  if (input.onActivateRow !== undefined && typeof input.onActivateRow !== 'function') throw new TypeError('Invalid data view activation callback.')
  if (input.onDeselectRow !== undefined && typeof input.onDeselectRow !== 'function') throw new TypeError('Invalid data view deselection callback.')
  const state = { columns, rows, orientation, ariaLabel, selectedRowId, selectedRowIds }
  if (new TextEncoder().encode(JSON.stringify(state)).byteLength > limits.payloadBytes) throw new RangeError('Data view payload limit exceeded.')
  return { ...state, onActivateRow: input.onActivateRow, onDeselectRow: input.onDeselectRow, onSelectionChange: input.onSelectionChange }
}

const browserTableHost = createBaseTableHost({
  themeTokens: {
    table: { headerBg: 'agentic-base-table-header', text: 'agentic-base-table-text', cellBorder: 'agentic-base-table-border', rowHoverHighlight: 'agentic-base-table-row-hover' },
    text: { primary: 'agentic-base-text-primary', secondary: 'agentic-base-text-secondary', tertiary: 'agentic-base-text-tertiary' },
    button: { hoverBg: 'agentic-base-button-hover' },
    panel: { border: 'agentic-base-panel-border' },
    icon: { color: 'agentic-base-icon-color' },
  },
  styles: {
    actionRowClass: 'agentic-base-action-row', compactGlyphClass: 'agentic-base-compact-glyph', dataViewMenuPanelClass: 'agentic-base-menu-panel',
    dataViewTableFrameClass: 'agentic-base-data-view', dataViewTableProgressClass: 'agentic-base-progress', dataViewTableValueClass: 'agentic-base-data-table-value',
    elementRowClass: 'agentic-base-element-row', inlineElementRowClass: 'agentic-base-inline-element-row', menuIconActionClass: 'agentic-base-menu-icon-action',
    textTruncateClass: 'agentic-base-text-truncate', toolbarRowScrollClass: 'agentic-base-toolbar-row-scroll', stickyHeaderClass: 'agentic-base-data-table-sticky-header',
  },
  helpers: {
    readHeaderPaddingClassName: () => 'agentic-base-data-header-cell',
    readTablePaddingClassName: () => 'agentic-base-data-cell',
    readFieldLineClassName: () => 'agentic-base-data-field-text',
  },
})

function BrowserDataView({ state }: { state: DataViewBrowserState }) {
  const hasHierarchy = state.rows.some(row => row.depth !== undefined)
  const columns: ViewModel['columns'] = state.columns.map(column => ({ id: column.id, name: column.name, kind: column.kind ?? 'text' }))
  if (hasHierarchy) columns.push({ id: '__agentic_base_level', name: 'Level', kind: 'text' })
  const view: ViewModel = {
    columns,
    rows: state.rows.map(row => ({
      id: row.id,
      cells: hasHierarchy ? [...row.cells, row.depth ? `L${row.depth}` : ''] : [...row.cells],
    })),
    titleColumnId: columns[0]!.id,
    groupByColumnId: null,
  }
  return <TableHostProvider value={browserTableHost}>
    <TableView
      view={view}
      visibleColumnIds={state.columns.map(column => column.id)}
      canMutate={false}
      canConfigure={false}
      ariaLabel={state.ariaLabel}
      onUpdateCell={() => { throw new Error('The offline browser table is read-only.') }}
      selectedRowId={state.selectedRowId}
      selectedRowIds={state.selectedRowIds}
      onActivateRow={state.onActivateRow}
      onDeselectRow={state.onDeselectRow}
      onSelectionChange={state.onSelectionChange}
      renderAllRows
      orientation={state.orientation ?? 'rows'}
      tableFit="container"
      rowHeightPreset="comfortable"
      fieldLineMode="single"
    />
  </TableHostProvider>
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
