import React from 'react'
import { Type } from 'lucide-react'
import type { ViewModel } from '../kanban/KanbanHostContext'
import type { ViewColumnType } from './ViewColumnType'
import { columnTypeToBaseKind, defaultColumnTypeForInferredKind, labelForViewColumnType } from './ViewColumnType'
import { useTableHost, type DataViewFieldLineMode } from './TableHostContext'
import { TableCore } from './TableCore'

type SourceLineNestedTableCell = unknown
const TABLE_FIELD_COLUMN_ID = '__field'
const TABLE_RENDER_ROW_INCREMENT = 32

type VisibleColumnMeta = { col: ViewModel['columns'][number]; index: number }
type VisibleNestedRowState = { row: ViewModel['rows'][number]; depth: number; childCount: number }
type EditingState = { rowId: string; colId: string; anchorEl: HTMLElement } | null

const isTruthy = (raw: string): boolean => {
  const v = String(raw || '').trim().toLowerCase()
  return v === 'true' || v === '1' || v === 'yes' || v === 'x'
}

const safeLinkHref = (raw: string): string | null => {
  const v = String(raw || '').trim()
  const lower = v.toLowerCase()
  return lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('mailto:') ? v : null
}

export function ColumnsTableView(props: {
  view: ViewModel
  visibleColumnMeta: VisibleColumnMeta[]
  visibleNestedRowStates: VisibleNestedRowState[]
  sourceLineNestedTableCells: ReadonlyMap<string, SourceLineNestedTableCell>
  hiddenRowCount: number
  titleColumnIndex: number
  hasNestedRowHierarchy: boolean
  areAllNestedRowsCollapsed: boolean
  collapsedNestedRowIds: ReadonlySet<string>
  columnTypesById?: Record<string, ViewColumnType> | null
  canConfigure: boolean
  canMutate: boolean
  editing: EditingState
  cellPaddingClassName: string
  headerPaddingClassName: string
  fieldLineClassName: string
  fieldLineMode: DataViewFieldLineMode
  readColumnWidth: (columnId: string, fallback?: number) => number
  previewColumnResize: (columnId: string, width: number) => void
  commitColumnResize: (columnId: string, width: number) => void
  setRenderedRowLimit: React.Dispatch<React.SetStateAction<number>>
  startEdit: (rowId: string, colId: string, current: string, anchorEl: HTMLElement) => void
  handleInlineTextCommit: (rowId: string, colId: string, nextValue: string) => void
  cancel: () => void
  toggleAllNestedRows: () => void
  toggleNestedRow: (rowId: string) => void
  onUpdateCell: (args: { rowId: string; columnId: string; nextValue: string }) => void
  onChangeColumnType?: (args: { columnId: string; nextType: ViewColumnType }) => void
  onHideColumnInView?: (columnId: string) => void
  onUpsertColumnFilter?: (args: { columnId: string; columnKind: ViewModel['columns'][number]['kind']; op: 'contains' | 'equals' | 'includes'; value: string }) => void
}) {
  const { themeTokens, styles, icons, components, data, helpers } = useTableHost()
  const {
    TagChip, ColumnTypeMenu, ColumnHeaderPropertyTypeMenu, ColumnHeaderMenu,
    HierarchyCell, InlineTextCellEditor, NestedRowsBulkToggle, ColumnResizeHandle,
  } = components
  const tableWidth = props.readColumnWidth(TABLE_FIELD_COLUMN_ID, 168)
    + props.visibleNestedRowStates.reduce((sum, { row }) => sum + props.readColumnWidth(`row:${row.id}`), 0)
  return (
    <TableCore
      columns={[
        { id: TABLE_FIELD_COLUMN_ID, width: props.readColumnWidth(TABLE_FIELD_COLUMN_ID, 168) },
        ...props.visibleNestedRowStates.map(({ row }) => ({ id: `row:${row.id}`, width: props.readColumnWidth(`row:${row.id}`) })),
      ]}
      frameClassName={styles.dataViewTableFrameClass}
      headerClassName={`${styles.stickyHeaderClass} ${themeTokens.table.headerBg} ${themeTokens.table.text}`}
      bodyClassName={themeTokens.table.text}
      tableClassName="min-w-max w-max"
      tableStyle={{ width: tableWidth }}
      ariaLabel="Table view"
      header={(
        <tr>
            <th className={`${props.headerPaddingClassName} relative z-[31] text-left font-semibold border-b ${themeTokens.table.cellBorder} ${themeTokens.table.headerBg}`}>
              Field
              <ColumnResizeHandle columnId={TABLE_FIELD_COLUMN_ID} width={props.readColumnWidth(TABLE_FIELD_COLUMN_ID, 168)} onPreview={props.previewColumnResize} onCommit={props.commitColumnResize} />
            </th>
            {props.visibleNestedRowStates.map(({ row }, rowIndex) => {
              const label = String(row.cells[props.titleColumnIndex] ?? '').trim() || `Row ${rowIndex + 1}`
              const columnId = `row:${row.id}`
              return (
                <th key={row.id} className={`${props.headerPaddingClassName} relative z-[31] text-left font-semibold border-b ${themeTokens.table.cellBorder} ${themeTokens.table.headerBg}`}>
                  <span className={[styles.textTruncateClass, 'block max-w-[14rem]'].join(' ')}>{helpers.readCellPreviewText(label)}</span>
                  <ColumnResizeHandle columnId={columnId} width={props.readColumnWidth(columnId)} onPreview={props.previewColumnResize} onCommit={props.commitColumnResize} />
                </th>
              )
            })}
        </tr>
      )}
      rows={(
        <>
          {props.hasNestedRowHierarchy ? (
            <tr data-agentic-base-column-record-hierarchy-row="1">
              <th className={`${props.headerPaddingClassName} text-left font-semibold border-b ${themeTokens.table.cellBorder} ${themeTokens.table.headerBg}`}>
                <span className={`${styles.inlineElementRowClass} gap-1`}><NestedRowsBulkToggle collapsed={props.areAllNestedRowsCollapsed} onToggle={props.toggleAllNestedRows} /><span>Hierarchy</span></span>
              </th>
              {props.visibleNestedRowStates.map(({ row, depth, childCount }) => (
                <HierarchyCell key={`column-record-hierarchy:${row.id}`} cellPaddingClassName={props.cellPaddingClassName} depth={depth} childCount={childCount} collapsed={props.collapsedNestedRowIds.has(row.id)} scope="columnRecord" onToggle={() => props.toggleNestedRow(row.id)} />
              ))}
            </tr>
          ) : null}
          {props.visibleColumnMeta.map(({ col: column, index: colIndex }) => {
            const type = (props.columnTypesById && props.columnTypesById[column.id]) || defaultColumnTypeForInferredKind(column.kind)
            const Icon = icons.iconByColumnType[type] || Type
            const allowTypeEdit = Boolean(props.canConfigure && props.onChangeColumnType)
            const filterOps = column.kind === 'multi-select'
              ? [{ key: 'includes', label: 'includes' }, { key: 'contains', label: 'contains' }, { key: 'equals', label: 'equals' }]
              : column.kind === 'select'
                ? [{ key: 'equals', label: 'equals' }, { key: 'contains', label: 'contains' }]
                : [{ key: 'contains', label: 'contains' }, { key: 'equals', label: 'equals' }]
            return (
              <tr key={column.id} className={`${themeTokens.table.rowHoverHighlight} transition-colors`}>
                <th className={`${props.headerPaddingClassName} text-left font-semibold border-b ${themeTokens.table.cellBorder} ${themeTokens.table.headerBg}`}>
                  <ColumnHeaderPropertyTypeMenu ariaLabel={`Column type: ${column.name}`} label={column.name} Icon={Icon} portal portalPlacement="bottom-start" toggleTargets="icon+chevron" menu={({ close }: { close: () => void }) => (
                    <ColumnHeaderMenu
                      ariaLabel={`Column menu: ${column.name}`} closeMenu={close} typeSummaryLabel="Type" typeValueLabel={labelForViewColumnType(type)} disableTypeChange={!allowTypeEdit}
                      renderTypeMenu={() => <ColumnTypeMenu ariaLabel={`Column type: ${column.name}`} value={type} close={close} disabled={!allowTypeEdit} onSelect={(next: ViewColumnType) => { if (allowTypeEdit) props.onChangeColumnType?.({ columnId: column.id, nextType: next }) }} />}
                      onHideInView={props.canConfigure && props.onHideColumnInView ? () => props.onHideColumnInView?.(column.id) : undefined}
                      filter={props.canConfigure && props.onUpsertColumnFilter ? { ops: filterOps, defaultOp: filterOps[0]?.key || 'contains', onApply: ({ op, value }: { op: 'contains' | 'equals' | 'includes'; value: string }) => props.onUpsertColumnFilter?.({ columnId: column.id, columnKind: column.kind, op, value }) } : undefined}
                      disableSort disableInsert disableDuplicate disableDelete disableMoveLeft disableMoveRight
                    />
                  )} />
                </th>
                {props.visibleNestedRowStates.map(({ row }) => {
                  const value = String(row.cells[colIndex] ?? '')
                  const uiType = (props.columnTypesById && props.columnTypesById[column.id]) || defaultColumnTypeForInferredKind(column.kind)
                  const baseKind = columnTypeToBaseKind(uiType)
                  const isEditing = props.editing?.rowId === row.id && props.editing?.colId === column.id
                  const cellBase = `${props.cellPaddingClassName} overflow-hidden border-b ${themeTokens.table.cellBorder} align-top`
                  if (isEditing) {
                    return (
                      <td key={`${row.id}:${column.id}`} className={cellBase}>
                        <InlineTextCellEditor key={`${row.id}:${column.id}`} ariaLabel={`Edit ${column.name}`} initialValue={value} textClassName={themeTokens.text.primary} markdownCommandContextText={data.buildMediaCommandContext(row)} onCommit={(next: string) => props.handleInlineTextCommit(row.id, column.id, next)} onCancel={props.cancel} />
                      </td>
                    )
                  }
                  const displayValue = data.readDisplayText(value)
                  const renderedDisplayValue = helpers.readCellDisplayText(displayValue, props.fieldLineMode)
                  const renderedRawValue = displayValue === value ? renderedDisplayValue : helpers.readCellDisplayText(value, props.fieldLineMode)
                  const chips = baseKind === 'multi-select' ? data.splitMultiValues(value) : []
                  const href = uiType === 'link' ? safeLinkHref(value) : null
                  const progressValue = uiType === 'progress' ? Number(value) : NaN
                  return (
                    <td key={`${row.id}:${column.id}`} className={cellBase} onClick={(event) => { const el = event.target as HTMLElement | null; if (el?.closest('a,button,input,select,textarea')) return; event.preventDefault(); event.stopPropagation(); props.startEdit(row.id, column.id, value, event.currentTarget) }} role={props.canMutate ? 'button' : undefined}>
                      {data.renderRichCell(value, { sourceLineNestedTable: column.name === 'Content' ? props.sourceLineNestedTableCells.get(row.id) : null }) || (uiType === 'checkbox' ? (
                        <input type="checkbox" checked={isTruthy(value)} disabled={!props.canMutate} onChange={event => { if (props.canMutate) props.onUpdateCell({ rowId: row.id, columnId: column.id, nextValue: event.target.checked ? 'true' : '' }) }} />
                      ) : uiType === 'progress' && Number.isFinite(progressValue) ? (
                        <section className={`${styles.elementRowClass} gap-2`}><progress className={styles.dataViewTableProgressClass} value={Math.max(0, Math.min(100, progressValue))} max={100} /><span className={['min-w-0', styles.textTruncateClass, themeTokens.text.secondary].join(' ')}>{`${Math.round(Math.max(0, Math.min(100, progressValue)))}%`}</span></section>
                      ) : href ? (
                        <a className={[styles.dataViewTableValueClass, props.fieldLineClassName, 'underline', themeTokens.text.primary].join(' ')} href={href} target="_blank" rel="noreferrer">{renderedRawValue === value ? data.renderInlineText(value) : renderedDisplayValue}</a>
                      ) : baseKind === 'select' && value ? <TagChip value={value} /> : baseKind === 'multi-select' && chips.length ? (
                        <section className={`${styles.toolbarRowScrollClass} gap-1`}>{chips.map((v: string) => <TagChip key={v} value={v} />)}</section>
                      ) : (
                        <span className={[styles.dataViewTableValueClass, props.fieldLineClassName, value ? '' : themeTokens.text.tertiary].join(' ')}>{value ? (renderedRawValue === value ? data.renderInlineText(value) : renderedDisplayValue) : (props.canMutate ? '—' : '')}</span>
                      ))}
                    </td>
                  )
                })}
              </tr>
            )
          })}
          {props.hiddenRowCount > 0 ? (
            <tr>
              <td colSpan={props.visibleNestedRowStates.length + 1} className={`${props.cellPaddingClassName} border-b ${themeTokens.table.cellBorder}`}>
                <button type="button" className={[styles.actionRowClass, 'gap-2 text-xs', themeTokens.text.secondary, themeTokens.button.hoverBg, 'px-2 py-1 rounded'].join(' ')} onClick={() => props.setRenderedRowLimit(limit => Math.min(props.view.rows.length, limit + TABLE_RENDER_ROW_INCREMENT))}>
                  <span className={styles.textTruncateClass}>{`Show ${Math.min(props.hiddenRowCount, TABLE_RENDER_ROW_INCREMENT)} more columns`}</span>
                </button>
              </td>
            </tr>
          ) : null}
        </>
      )}
    />
  )
}
