import React from 'react'
import type { ViewModel } from '../kanban/KanbanHostContext'
import type { ViewColumnType } from './ViewColumnType'
import { columnTypeToBaseKind, defaultColumnTypeForInferredKind, labelForViewColumnType } from './ViewColumnType'
import { useTableHost, type DataViewFieldLineMode, type DataViewRowHeightPreset } from './TableHostContext'
import { TableCore } from './TableCore'
import { ColumnsTableView } from './ColumnsTableView'
import { buildRowSelectionHierarchy, readRowSelectionStates, readRowSelectionState, toggleHierarchicalRowSelection } from './rowSelection'
import { Plus, Type } from 'lucide-react'
export type TableViewProps = {
  view: ViewModel
  visibleColumnIds?: string[] | null
  columnTypesById?: Record<string, ViewColumnType> | null
  canMutate: boolean
  canConfigure?: boolean
  onUpdateCell: (args: { rowId: string; columnId: string; nextValue: string }) => void
  onActivateRow?: (rowId: string) => void
  onDeselectRow?: (rowId: string) => void
  selectedRowId?: string | null
  /** Controlled checkbox selection. Supply both props to enable row and select-all checkboxes. */
  selectedRowIds?: readonly string[]
  onSelectionChange?: (selectedRowIds: string[]) => void
  ariaLabel?: string
  onNewRecord?: () => void
  onAddColumn?: (args: { name: string; columnType: ViewColumnType }) => void
  onChangeColumnType?: (args: { columnId: string; nextType: ViewColumnType }) => void
  onHideColumnInView?: (columnId: string) => void
  onUpsertColumnFilter?: (args: { columnId: string; columnKind: ViewModel['columns'][number]['kind']; op: 'contains' | 'equals' | 'includes'; value: string }) => void
  onSetColumnSort?: (args: { columnId: string; direction: 'asc' | 'desc' }) => void
  renderAllRows?: boolean
  orientation?: 'rows' | 'columns'
  tableFit?: 'content' | 'container'
  rowHeightPreset?: DataViewRowHeightPreset
  fieldLineMode?: DataViewFieldLineMode
}
const isTruthy = (raw: string): boolean => {
  const v = String(raw || '').trim().toLowerCase()
  return v === 'true' || v === '1' || v === 'yes' || v === 'x'
}
const safeLinkHref = (raw: string): string | null => {
  const v = String(raw || '').trim()
  if (!v) return null
  const lower = v.toLowerCase()
  if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('mailto:')) return v
  return null
}
export const TABLE_INITIAL_RENDER_ROW_LIMIT = 32
export const TABLE_RENDER_ROW_INCREMENT = 32
const TABLE_HIERARCHY_COLUMN_WIDTH_PX = 64
const TABLE_SELECTABLE_HIERARCHY_COLUMN_WIDTH_PX = 80
const TABLE_HIERARCHY_CONTROL_INSET_PX = 12
const TABLE_HIERARCHY_CONTROL_SIZE_PX = 24
const TABLE_HIERARCHY_GROUP_SELECTION_OFFSET_PX = 27
export const TABLE_FIELD_COLUMN_ID = '__field'
export const TableView = React.memo(function TableView(props: TableViewProps) {
  const {
    themeTokens, copy: viewCopy, styles, icons, components, stores, data, helpers,
  } = useTableHost()
  const {
    actionRowClass, compactGlyphClass, dataViewMenuPanelClass, dataViewTableFrameClass,
    dataViewTableProgressClass, dataViewTableValueClass, elementRowClass,
    inlineElementRowClass, menuIconActionClass, textTruncateClass, toolbarRowScrollClass,
    stickyHeaderClass,
  } = styles
  const {
    TagChip, ColumnTypeMenu, AddColumnMenu, ColumnHeaderPropertyTypeMenu,
    ColumnHeaderMenu, HierarchyCell, InlineTextCellEditor, NestedRowsBulkToggle,
    ColumnResizeHandle, CellSelectPopover,
  } = components
  const { tablePreferences: workspaceTablePreferencesStore } = stores
  const { iconByColumnType } = icons
  const {
    splitMultiValues, readDisplayText, renderInlineText, buildMediaCommandContext,
    buildNestedCellMap, renderRichCell, useNestedRowCollapse,
  } = data
  const {
    defaultColumnWidthPx, readDefaultColumnWidth,
    readCellDisplayText,
    readCellPreviewText, coerceFieldLineMode,
    coerceRowHeightPreset, readFieldLineClassName,
    readHeaderPaddingClassName, readTablePaddingClassName,
  } = helpers
  const { view, visibleColumnIds, columnTypesById, canMutate, onUpdateCell, onActivateRow } = props
  const selectedRowIds = props.selectedRowIds ?? []
  const selectedRowIdSet = React.useMemo(
    () => new Set(props.selectedRowIds ?? (props.selectedRowId ? [props.selectedRowId] : [])),
    [props.selectedRowId, props.selectedRowIds],
  )
  const multiRowSelectionEnabled = props.selectedRowIds !== undefined && Boolean(props.onSelectionChange)
  const canConfigure = props.canConfigure ?? canMutate
  const orientation = props.orientation === 'columns' ? 'columns' : 'rows'
  const rowHeightPreset = coerceRowHeightPreset(props.rowHeightPreset)
  const fieldLineMode = coerceFieldLineMode(props.fieldLineMode)
  const cellPaddingClassName = readTablePaddingClassName(rowHeightPreset)
  const headerPaddingClassName = readHeaderPaddingClassName(rowHeightPreset)
  const fieldLineClassName = readFieldLineClassName(fieldLineMode)
  const [editing, setEditing] = React.useState<{ rowId: string; colId: string; anchorEl: HTMLElement } | null>(null)
  const [draft, setDraft] = React.useState('')
  const [renderedRowLimit, setRenderedRowLimit] = React.useState(TABLE_INITIAL_RENDER_ROW_LIMIT)
  const [previewColumnWidthsById, setPreviewColumnWidthsById] = React.useState<Record<string, number>>({})
  const draftRef = React.useRef('')
  draftRef.current = draft
  const startEdit = React.useCallback(
    (rowId: string, colId: string, current: string, anchorEl: HTMLElement) => {
      if (!canMutate) return
      setEditing({ rowId, colId, anchorEl })
      setDraft(String(current ?? ''))
    },
    [canMutate],
  )
  const commit = React.useCallback((nextOverride?: string) => {
    if (!editing) return
    if (!canMutate) {
      setEditing(null)
      return
    }
    const nextValue = typeof nextOverride === 'string' ? nextOverride : draftRef.current
    onUpdateCell({ rowId: editing.rowId, columnId: editing.colId, nextValue })
    setEditing(null)
  }, [canMutate, editing, onUpdateCell])
  const cancel = React.useCallback(() => {
    setEditing(null)
  }, [])
  const handleInlineTextCommit = React.useCallback(
    (rowId: string, colId: string, nextValue: string) => {
      if (!canMutate) return
      if (!editing || editing.rowId !== rowId || editing.colId !== colId) return
      commit(nextValue)
    },
    [canMutate, commit, editing],
  )
  const visibleColumnMeta = React.useMemo(() => {
    if (!visibleColumnIds) return view.columns.map((c, idx) => ({ col: c, index: idx }))
    const allowed = new Set(visibleColumnIds)
    return view.columns
      .map((c, idx) => ({ col: c, index: idx }))
      .filter(x => allowed.has(x.col.id))
  }, [view.columns, visibleColumnIds])
  const visibleColumnSignature = React.useMemo(
    () => visibleColumnMeta.map(({ col }) => col.id).join('\u0000'),
    [visibleColumnMeta],
  )
  const readColumnWidth = React.useCallback((columnId: string, fallback = defaultColumnWidthPx) => {
    const previewWidth = previewColumnWidthsById[columnId]
    if (typeof previewWidth === 'number' && Number.isFinite(previewWidth)) return previewWidth
    if (!Number.isFinite(fallback) || fallback <= 0) {
      throw new Error(`Table host returned an invalid width for column ${columnId}`)
    }
    return fallback
  }, [defaultColumnWidthPx, previewColumnWidthsById])
  const previewColumnResize = React.useCallback((columnId: string, width: number) => {
    setPreviewColumnWidthsById(prev => ({ ...prev, [columnId]: width }))
  }, [])
  const commitColumnResize = React.useCallback(previewColumnResize, [previewColumnResize])
  React.useEffect(() => {
    if (props.renderAllRows) {
      setRenderedRowLimit(view.rows.length)
      return
    }
    setRenderedRowLimit(TABLE_INITIAL_RENDER_ROW_LIMIT)
  }, [props.renderAllRows, view.rows, visibleColumnSignature])
  React.useEffect(() => {
    if (!editing) return
    const rowIndex = view.rows.findIndex(row => row.id === editing.rowId)
    if (rowIndex < 0 || rowIndex < renderedRowLimit) return
    setRenderedRowLimit(Math.min(view.rows.length, rowIndex + 1))
  }, [editing, renderedRowLimit, view.rows])
  const renderedRows = React.useMemo(
    () => (props.renderAllRows ? view.rows : view.rows.slice(0, Math.min(view.rows.length, renderedRowLimit))),
    [props.renderAllRows, renderedRowLimit, view.rows],
  )
  const hiddenRowCount = Math.max(0, view.rows.length - renderedRows.length)
  const [contentColumnIndex, lineColumnIndex, levelColumnIndex, indentColumnIndex] = React.useMemo(() => {
    const findColumn = (name: string) => view.columns.findIndex(column => String(column.name || '').trim() === name)
    return [findColumn('Content'), findColumn('Line'), findColumn('Level'), findColumn('Indent')] as const
  }, [view.columns])
  const sourceLineNestedTableCells = React.useMemo(
    () => buildNestedCellMap({ rows: renderedRows, contentColumnIndex, lineColumnIndex, levelColumnIndex, indentColumnIndex }),
    [contentColumnIndex, indentColumnIndex, levelColumnIndex, lineColumnIndex, renderedRows],
  )
  const { areAllNestedRowsCollapsed, collapsedNestedRowIds, hasNestedRowHierarchy, toggleAllNestedRows, toggleNestedRow, visibleNestedRowStates } = useNestedRowCollapse({ rows: renderedRows, levelColumnIndex, indentColumnIndex })
  const selectionHierarchy = React.useMemo(
    () => buildRowSelectionHierarchy(view.rows, levelColumnIndex, indentColumnIndex),
    [indentColumnIndex, levelColumnIndex, view.rows],
  )
  const selectionStates = React.useMemo(
    () => readRowSelectionStates(selectedRowIdSet, selectionHierarchy),
    [selectedRowIdSet, selectionHierarchy],
  )
  const selectableRowIds = selectionHierarchy.rowIds
  const selectableRowIdSet = new Set(selectableRowIds)
  const selectedVisibleRowCount = selectableRowIds.reduce((count, rowId) => count + Number(selectionStates.get(rowId)?.checked), 0)
  const partiallySelectedRowCount = selectableRowIds.reduce((count, rowId) => count + Number(selectionStates.get(rowId)?.mixed), 0)
  const allRowsSelected = selectableRowIds.length > 0 && selectedVisibleRowCount === selectableRowIds.length
  const someRowsSelected = (selectedVisibleRowCount > 0 || partiallySelectedRowCount > 0) && !allRowsSelected
  const rowSelectionEnabled = hasNestedRowHierarchy && (multiRowSelectionEnabled || (props.selectedRowId !== undefined && Boolean(onActivateRow)))
  const toggleAllRows = () => {
    if (!multiRowSelectionEnabled) return
    const next = allRowsSelected
      ? selectedRowIds.filter(rowId => !selectableRowIdSet.has(rowId))
      : Array.from(new Set([...selectedRowIds, ...selectableRowIds]))
    props.onSelectionChange?.(next)
  }
  const minimumVisibleRowDepth = visibleNestedRowStates.reduce((minimum: number, state: { depth: number }) => Math.min(minimum, state.depth), Number.POSITIVE_INFINITY)
  const maximumVisibleRowIndent = visibleNestedRowStates.reduce((maximum: number, state: { depth: number }) => Math.max(maximum, state.depth - minimumVisibleRowDepth), 0)
  const rowNumberById = new Map<string, number>()
  const siblingRowCounts = new Map<number, number>()
  for (const state of visibleNestedRowStates) {
    for (const depth of siblingRowCounts.keys()) if (depth > state.depth) siblingRowCounts.delete(depth)
    if (state.childCount > 0) continue
    const rowNumber = (siblingRowCounts.get(state.depth) ?? 0) + 1
    siblingRowCounts.set(state.depth, rowNumber)
    rowNumberById.set(state.row.id, rowNumber)
  }
  const workspaceCellSelectPanelPlacement = React.useSyncExternalStore(
    workspaceTablePreferencesStore.subscribe,
    () => workspaceTablePreferencesStore.getSnapshot().workspaceCellSelectPanelPlacement,
    () => workspaceTablePreferencesStore.getServerSnapshot().workspaceCellSelectPanelPlacement,
  )
  const columnIndexById = React.useMemo(() => {
    const map = new Map<string, number>()
    for (let i = 0; i < view.columns.length; i += 1) {
      map.set(view.columns[i].id, i)
    }
    return map
  }, [view.columns])
  const editingMeta = React.useMemo(() => {
    if (!editing) return null
    const colIndex = columnIndexById.get(editing.colId)
    if (colIndex == null) return null
    const column = view.columns[colIndex]
    if (!column) return null
    const uiType = (columnTypesById && columnTypesById[column.id]) || defaultColumnTypeForInferredKind(column.kind)
    const baseKind = columnTypeToBaseKind(uiType)
    return {
      rowId: editing.rowId,
      colId: editing.colId,
      colIndex,
      column,
      uiType,
      baseKind,
      anchorEl: editing.anchorEl,
    }
  }, [columnIndexById, columnTypesById, editing, view.columns])
  const editingSelectOptions = React.useMemo(() => {
    if (!editingMeta) return []
    if (editingMeta.baseKind !== 'select' || editingMeta.uiType === 'checkbox') return []
    if (editingMeta.column.kind === 'select' && Array.isArray(editingMeta.column.options)) {
      const base = editingMeta.column.options.map(x => String(x || '').trim()).filter(Boolean)
      if (base.length) return base
    }
    const set = new Set<string>()
    for (const r of view.rows) {
      const v = String(r.cells[editingMeta.colIndex] ?? '').trim()
      if (!v) continue
      set.add(v)
      if (set.size >= 64) break
    }
    return Array.from(set)
  }, [editingMeta, view.rows])
  const editingMultiSelectOptions = React.useMemo(() => {
    if (!editingMeta) return []
    if (editingMeta.baseKind !== 'multi-select') return []
    if (editingMeta.column.kind === 'multi-select' && Array.isArray(editingMeta.column.options)) {
      const base = editingMeta.column.options.map(x => String(x || '').trim()).filter(Boolean)
      if (base.length) return base
    }
    const set = new Set<string>()
    const list: string[] = []
    for (const r of view.rows) {
      const vals = splitMultiValues(String(r.cells[editingMeta.colIndex] ?? ''))
      for (const v of vals) {
        const key = v.toLowerCase()
        if (set.has(key)) continue
        set.add(key)
        list.push(v)
        if (list.length >= 96) break
      }
      if (list.length >= 96) break
    }
    return list
  }, [editingMeta, view.rows])
  const titleColumnIndex = React.useMemo(() => {
    const index = view.columns.findIndex(column => column.id === view.titleColumnId)
    return index >= 0 ? index : 0
  }, [view.columns, view.titleColumnId])
  const baseHierarchyColumnWidthPx = rowSelectionEnabled
    ? TABLE_SELECTABLE_HIERARCHY_COLUMN_WIDTH_PX
    : TABLE_HIERARCHY_COLUMN_WIDTH_PX
  const hierarchyColumnWidthPx = Math.max(
    baseHierarchyColumnWidthPx,
    maximumVisibleRowIndent * 24 + TABLE_HIERARCHY_CONTROL_INSET_PX + (rowSelectionEnabled
      ? TABLE_HIERARCHY_GROUP_SELECTION_OFFSET_PX + TABLE_HIERARCHY_CONTROL_SIZE_PX
      : TABLE_HIERARCHY_CONTROL_SIZE_PX),
  )
  const rowRecordTableWidth = (hasNestedRowHierarchy ? hierarchyColumnWidthPx : 0)
    + visibleColumnMeta.reduce((sum, { col }) => sum + readColumnWidth(col.id, readDefaultColumnWidth(col.name)), 0)
    + (canMutate && props.onAddColumn ? 52 : 0)
  const tableFit = props.tableFit === 'container' ? 'container' : 'content'
  const tableSizeClassName = tableFit === 'container'
    ? 'min-w-full w-full agentic-base-data-table'
    : 'min-w-max w-max agentic-base-data-table'
  const tableStyle: React.CSSProperties = tableFit === 'container'
    ? { minWidth: rowRecordTableWidth, width: '100%' }
    : { width: rowRecordTableWidth }
  if (orientation === 'columns') {
    return (
      <ColumnsTableView
        view={view}
        visibleColumnMeta={visibleColumnMeta}
        visibleNestedRowStates={visibleNestedRowStates}
        sourceLineNestedTableCells={sourceLineNestedTableCells}
        hiddenRowCount={hiddenRowCount}
        titleColumnIndex={titleColumnIndex}
        hasNestedRowHierarchy={hasNestedRowHierarchy}
        areAllNestedRowsCollapsed={areAllNestedRowsCollapsed}
        collapsedNestedRowIds={collapsedNestedRowIds}
        columnTypesById={columnTypesById}
        canConfigure={canConfigure}
        canMutate={canMutate}
        editing={editing}
        cellPaddingClassName={cellPaddingClassName}
        headerPaddingClassName={headerPaddingClassName}
        fieldLineClassName={fieldLineClassName}
        readColumnWidth={readColumnWidth}
        previewColumnResize={previewColumnResize}
        commitColumnResize={commitColumnResize}
        setRenderedRowLimit={setRenderedRowLimit}
        startEdit={startEdit}
        handleInlineTextCommit={handleInlineTextCommit}
        cancel={cancel}
        fieldLineMode={fieldLineMode}
        toggleAllNestedRows={toggleAllNestedRows}
        toggleNestedRow={toggleNestedRow}
        onUpdateCell={onUpdateCell}
        onChangeColumnType={props.onChangeColumnType}
        onHideColumnInView={props.onHideColumnInView}
        onUpsertColumnFilter={props.onUpsertColumnFilter}
      />
    )
  }
  return (
    <TableCore
      columns={[
        ...(hasNestedRowHierarchy ? [{ id: '__hierarchy', width: hierarchyColumnWidthPx }] : []),
        ...visibleColumnMeta.map(({ col }) => ({ id: col.id, width: readColumnWidth(col.id, readDefaultColumnWidth(col.name)) })),
        ...(canMutate && props.onAddColumn ? [{ id: '__add', width: 52 }] : []),
      ]}
      frameClassName={dataViewTableFrameClass}
      headerClassName={`${stickyHeaderClass} ${themeTokens.table.headerBg} ${themeTokens.table.text}`}
      bodyClassName={themeTokens.table.text}
      tableClassName={tableSizeClassName}
      tableStyle={tableStyle}
      ariaLabel={props.ariaLabel ?? 'Table view'}
      header={(
        <tr>
            {hasNestedRowHierarchy ? (
              <th aria-label="Nested row hierarchy" className={`${headerPaddingClassName} relative z-[31] border-b text-left ${themeTokens.table.cellBorder} ${themeTokens.table.headerBg}`} style={{ width: hierarchyColumnWidthPx }}>
                <NestedRowsBulkToggle
                  collapsed={areAllNestedRowsCollapsed}
                  onToggle={toggleAllNestedRows}
                  selection={multiRowSelectionEnabled ? { checked: allRowsSelected, mixed: someRowsSelected, onChange: toggleAllRows } : undefined}
                />
              </th>
            ) : null}
            {visibleColumnMeta.map(({ col: c }) => {
              const type = (columnTypesById && columnTypesById[c.id]) || defaultColumnTypeForInferredKind(c.kind)
              const Icon = iconByColumnType[type] || Type
              const allowTypeEdit = Boolean(canConfigure && props.onChangeColumnType)
              const canSort = Boolean(canConfigure && props.onSetColumnSort && c.id === view.titleColumnId)
              const filterOps = c.kind === 'multi-select'
                ? [{ key: 'includes', label: 'includes' }, { key: 'contains', label: 'contains' }, { key: 'equals', label: 'equals' }]
                : c.kind === 'select'
                  ? [{ key: 'equals', label: 'equals' }, { key: 'contains', label: 'contains' }]
                  : [{ key: 'contains', label: 'contains' }, { key: 'equals', label: 'equals' }]
              return (
              <th
                key={c.id}
                className={`${headerPaddingClassName} relative z-[31] text-left font-semibold border-b ${themeTokens.table.cellBorder} ${themeTokens.table.headerBg}`}
              >
                <section className="flex min-w-0 items-center gap-2 overflow-hidden">
                  <ColumnHeaderPropertyTypeMenu
                    ariaLabel={`Column type: ${c.name}`}
                    label={c.name}
                    Icon={Icon}
                    portal
                    portalPlacement="bottom-start"
                    toggleTargets="icon+chevron"
                    menu={({ close }: { close: () => void }) => (
                      <ColumnHeaderMenu
                        ariaLabel={`Column menu: ${c.name}`}
                        closeMenu={close}
                        typeSummaryLabel="Type"
                        typeValueLabel={labelForViewColumnType(type)}
                        disableTypeChange={!allowTypeEdit}
                        renderTypeMenu={() => (
                          <ColumnTypeMenu
                            ariaLabel={`Column type: ${c.name}`}
                            value={type}
                            close={close}
                            disabled={!allowTypeEdit}
                            onSelect={(next: ViewColumnType) => {
                              if (!allowTypeEdit) return
                              props.onChangeColumnType?.({ columnId: c.id, nextType: next })
                            }}
                          />
                        )}
                        onHideInView={canConfigure && props.onHideColumnInView ? () => props.onHideColumnInView?.(c.id) : undefined}
                        filter={
                          canConfigure && props.onUpsertColumnFilter
                            ? {
                                ops: filterOps,
                                defaultOp: filterOps[0]?.key || 'contains',
                                onApply: ({ op, value }: { op: string; value: string }) =>
                                  props.onUpsertColumnFilter?.({
                                    columnId: c.id,
                                    columnKind: c.kind,
                                    op: (op === 'includes' ? 'includes' : op === 'equals' ? 'equals' : 'contains'),
                                    value,
                                  }),
                              }
                            : undefined
                        }
                        onSortAsc={canSort ? () => props.onSetColumnSort?.({ columnId: c.id, direction: 'asc' }) : undefined}
                        onSortDesc={canSort ? () => props.onSetColumnSort?.({ columnId: c.id, direction: 'desc' }) : undefined}
                        disableSort={!canSort}
                        disableInsert
                        disableDuplicate
                        disableDelete
                        disableMoveLeft
                        disableMoveRight
                      />
                    )}
                  />
                </section>
                <ColumnResizeHandle columnId={c.id} width={readColumnWidth(c.id, readDefaultColumnWidth(c.name))} onPreview={previewColumnResize} onCommit={commitColumnResize} />
              </th>
              )
            })}
            {canMutate && props.onAddColumn ? (
              <th
                className={`${headerPaddingClassName} relative z-[31] text-left font-semibold border-b ${themeTokens.table.cellBorder} ${themeTokens.table.headerBg}`}
              >
                <AddColumnMenu
                  ariaLabel="Add column"
                  nextColumnNumber={view.columns.length + 1}
                  canMutate={canMutate}
                  onAddColumn={props.onAddColumn}
                  summaryClassName={['list-none', menuIconActionClass, 'rounded border cursor-pointer', themeTokens.panel.border, themeTokens.button.hoverBg].join(' ')}
                  menuPositionClassName={`kg-data-view-add-column-menu absolute right-0 mt-2 ${dataViewMenuPanelClass}`}
                />
              </th>
            ) : null}
        </tr>
      )}
      rows={(
        <>
          {visibleNestedRowStates.map(({ row: r, depth: rowDepth, childCount }: { row: ViewModel['rows'][number]; depth: number; childCount: number }) => {
            const isNestedRowCollapsed = collapsedNestedRowIds.has(r.id)
            const selectionState = selectionStates.get(r.id) ?? { checked: false, mixed: false }
            const selected = selectionState.checked
            const selectionEnabled = rowSelectionEnabled
            const rowIndentLevel = Math.max(0, rowDepth - minimumVisibleRowDepth)
            const rowLabel = String(r.cells[titleColumnIndex] ?? '').trim() || r.id
            return <tr
              key={r.id}
              role="row"
              aria-label={`Data row: ${rowLabel}`}
              className={[
                'agentic-base-data-row',
                `${themeTokens.table.rowHoverHighlight} transition-colors`,
                onActivateRow ? 'agentic-base-data-row-activatable' : '',
                selected ? themeTokens.table.rowSelected : '',
              ].filter(Boolean).join(' ')}
              aria-selected={props.selectedRowIds !== undefined || props.selectedRowId !== undefined ? selected : undefined}
              data-agentic-base-row-depth={String(rowDepth)}
              data-agentic-base-row-parent={childCount > 0 ? 'true' : undefined}
              data-agentic-base-row-hierarchy={hasNestedRowHierarchy ? 'true' : undefined}
              style={hasNestedRowHierarchy
                ? { '--agentic-base-row-label-offset': `${rowIndentLevel * 24}px` } as React.CSSProperties
                : undefined}
              onClick={
                onActivateRow
                  ? (e) => {
                      const el = e.target as HTMLElement | null
                      if (el?.closest('input,select,textarea,button')) return
                      onActivateRow(r.id)
                    }
                  : undefined
              }
            >
              {hasNestedRowHierarchy ? (
                <HierarchyCell
                  cellPaddingClassName={cellPaddingClassName}
                  depth={rowIndentLevel}
                  childCount={childCount}
                  collapsed={isNestedRowCollapsed}
                  scope="row"
                  onToggle={() => toggleNestedRow(r.id)}
                  selectable={selectionEnabled}
                  selected={selected}
                  mixed={selectionState.mixed}
                  selectionLabel={rowLabel}
                  rowNumber={rowNumberById.get(r.id)}
                  onSelect={() => {
                    if (multiRowSelectionEnabled) {
                      props.onSelectionChange?.(toggleHierarchicalRowSelection(r.id, selectedRowIds, selectionHierarchy))
                    } else if (selected) {
                      props.onDeselectRow?.(r.id)
                    } else {
                      onActivateRow?.(r.id)
                    }
                  }}
                />
              ) : null}
              {visibleColumnMeta.map(({ col: c, index: colIndex }) => {
                const value = String(r.cells[colIndex] ?? '')
                const rowInlineMediaCommandContext = buildMediaCommandContext(r)
                const displayValue = readDisplayText(value)
                const uiType = (columnTypesById && columnTypesById[c.id]) || defaultColumnTypeForInferredKind(c.kind)
                const baseKind = columnTypeToBaseKind(uiType)
                const isEditing = editing?.rowId === r.id && editing?.colId === c.id
                const cellBase = `${cellPaddingClassName} overflow-hidden border-b ${themeTokens.table.cellBorder} align-top`
                if (isEditing) {
                  const isSelect = baseKind === 'select' && uiType !== 'checkbox'
                  const isCheckbox = uiType === 'checkbox'
                  const isMulti = baseKind === 'multi-select'
                  return (
                    <td key={c.id} className={cellBase}>
                      {isCheckbox ? (
                        <label className={`${inlineElementRowClass} gap-2`}>
                          <input
                            autoFocus
                            type="checkbox"
                            checked={isTruthy(value)}
                            onChange={e => {
                              onUpdateCell({ rowId: r.id, columnId: c.id, nextValue: e.target.checked ? 'true' : '' })
                              setEditing(null)
                            }}
                          />
                          <span className={['min-w-0 text-xs', textTruncateClass, themeTokens.text.secondary].join(' ')}>{isTruthy(value) ? 'Checked' : 'Unchecked'}</span>
                        </label>
                      ) : isSelect ? (
                        draft ? <TagChip value={draft} /> : <span className={themeTokens.text.tertiary}>—</span>
                      ) : isMulti ? (
                        (() => {
                          const chips = splitMultiValues(draft)
                          if (!chips.length) return <span className={themeTokens.text.tertiary}>—</span>
                          return (
                            <section className={`${toolbarRowScrollClass} gap-1`}>
                              {chips.map((v: string) => (
                                <TagChip key={v} value={v} />
                              ))}
                            </section>
                          )
                        })()
                      ) : (
                        <InlineTextCellEditor
                          key={`${r.id}:${c.id}`}
                          ariaLabel={`Edit ${c.name}`}
                          initialValue={value}
                          textClassName={themeTokens.text.primary}
                          markdownCommandContextText={rowInlineMediaCommandContext}
                          onCommit={(next: string) => handleInlineTextCommit(r.id, c.id, next)}
                          onCancel={cancel}
                        />
                      )}
                    </td>
                  )
                }
                const chips = baseKind === 'multi-select' ? splitMultiValues(value) : []
                const href = uiType === 'link' ? safeLinkHref(value) : null
                const progressValue = uiType === 'progress' ? Number(value) : NaN
                const renderedDisplayValue = readCellDisplayText(displayValue, fieldLineMode)
                const renderedRawValue = displayValue === value ? renderedDisplayValue : readCellDisplayText(value, fieldLineMode)
                const renderedDisplayIsTruncated = renderedDisplayValue !== displayValue
                return (
                  <td
                    key={c.id}
                    className={cellBase}
                    onClick={(e) => {
                      const el = e.target as HTMLElement | null
                      if (el?.closest('a,button,input,select,textarea')) return
                      if (!canMutate) return
                      e.preventDefault()
                      e.stopPropagation()
                      startEdit(r.id, c.id, value, e.currentTarget)
                    }}
                    role={canMutate ? 'button' : undefined}
                  >
                    {renderRichCell(value, { sourceLineNestedTable: c.name === 'Content' ? sourceLineNestedTableCells.get(r.id) : null }) || (uiType === 'checkbox' ? (
                      <span className={['inline-flex items-center gap-2', themeTokens.text.primary].join(' ')}>
                        <input
                          type="checkbox"
                          checked={isTruthy(value)}
                          disabled={!canMutate}
                          onChange={e => {
                            if (!canMutate) return
                            onUpdateCell({ rowId: r.id, columnId: c.id, nextValue: e.target.checked ? 'true' : '' })
                          }}
                        />
                      </span>
                    ) : uiType === 'progress' && Number.isFinite(progressValue) ? (
                      <section className={`${elementRowClass} gap-2`}>
                        <progress className={dataViewTableProgressClass} value={Math.max(0, Math.min(100, progressValue))} max={100} />
                        <span className={['min-w-0', textTruncateClass, themeTokens.text.secondary].join(' ')}>{`${Math.round(Math.max(0, Math.min(100, progressValue)))}%`}</span>
                      </section>
                    ) : href ? (
                      <a className={[dataViewTableValueClass, fieldLineClassName, 'underline', themeTokens.text.primary].join(' ')} href={href} target="_blank" rel="noreferrer" aria-label={renderedDisplayIsTruncated ? renderedDisplayValue : undefined}>
                        {renderedRawValue === value ? renderInlineText(value) : renderedDisplayValue}
                      </a>
                    ) : baseKind === 'select' && value ? (
                      <TagChip value={value} />
                    ) : baseKind === 'multi-select' && chips.length ? (
                      <section className={`${toolbarRowScrollClass} gap-1`}>
                        {chips.map((v: string) => (
                          <TagChip key={v} value={v} />
                        ))}
                      </section>
                    ) : (
                      <span className={[dataViewTableValueClass, fieldLineClassName, value ? '' : themeTokens.text.tertiary].join(' ')} aria-label={renderedDisplayIsTruncated ? renderedDisplayValue : undefined}>
                        {value ? (renderedRawValue === value ? renderInlineText(value) : renderedDisplayValue) : '—'}
                      </span>
                    ))}
                  </td>
                )
              })}
              {canMutate && props.onAddColumn ? (
                <td className={`${headerPaddingClassName} border-b ${themeTokens.table.cellBorder}`} />
              ) : null}
            </tr>
          })}
          {canMutate && props.onNewRecord ? (
            <tr>
              <td
                colSpan={visibleColumnMeta.length + (hasNestedRowHierarchy ? 1 : 0) + (canMutate && props.onAddColumn ? 1 : 0)}
                className={`${cellPaddingClassName} border-b ${themeTokens.table.cellBorder}`}
              >
                <button
                  type="button"
                  className={[actionRowClass, 'gap-2 text-xs', themeTokens.text.tertiary, themeTokens.button.hoverBg, 'px-2 py-1 rounded'].join(' ')}
                  onClick={() => props.onNewRecord?.()}
                >
                  <Plus aria-label="New record" className={[compactGlyphClass, themeTokens.icon.color].join(' ')} />
                  <span className={textTruncateClass}>{viewCopy.newRecordLabel}</span>
                </button>
              </td>
            </tr>
          ) : null}
          {hiddenRowCount > 0 ? (
            <tr>
              <td
                colSpan={visibleColumnMeta.length + (hasNestedRowHierarchy ? 1 : 0) + (canMutate && props.onAddColumn ? 1 : 0)}
                className={`${cellPaddingClassName} border-b ${themeTokens.table.cellBorder}`}
              >
                <button
                  type="button"
                  className={[actionRowClass, 'gap-2 text-xs', themeTokens.text.secondary, themeTokens.button.hoverBg, 'px-2 py-1 rounded'].join(' ')}
                  onClick={() => setRenderedRowLimit(limit => Math.min(view.rows.length, limit + TABLE_RENDER_ROW_INCREMENT))}
                >
                  <span className={textTruncateClass}>{`Show ${Math.min(hiddenRowCount, TABLE_RENDER_ROW_INCREMENT)} more rows`}</span>
                </button>
              </td>
            </tr>
          ) : null}
        </>
      )}
    >
      <CellSelectPopover
        editingMeta={editingMeta}
        placement={workspaceCellSelectPanelPlacement}
        draft={draft}
        canMutate={canMutate}
        editingSelectOptions={editingSelectOptions}
        editingMultiSelectOptions={editingMultiSelectOptions}
        setDraft={setDraft}
        setEditingNull={() => setEditing(null)}
        onUpdateCell={onUpdateCell}
      />
    </TableCore>
  )
})

export { TableHostProvider } from './TableHostContext'
export type { TableHostAdapter } from './TableHostContext'
export { createBaseTableHost } from './BaseTableHost'
