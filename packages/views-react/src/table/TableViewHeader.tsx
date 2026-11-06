import React from 'react'
import { Type } from 'lucide-react'
import { useTableHost } from './TableHostContext'
import { defaultColumnTypeForInferredKind, labelForViewColumnType, type ViewColumnType } from './ViewColumnType'
import type { TableViewProps } from './TableView'

/** One header owner, including hierarchy, selection and column actions. */
export function TableViewHeader(args: {
  tableProps: TableViewProps
  visibleColumnMeta: { col: TableViewProps['view']['columns'][number]; index: number }[]
  hasNestedRowHierarchy: boolean
  hierarchyColumnWidthPx: number
  headerPaddingClassName: string
  areAllNestedRowsCollapsed: boolean
  toggleAllNestedRows: () => void
  multiRowSelectionEnabled: boolean
  allRowsSelected: boolean
  someRowsSelected: boolean
  toggleAllRows: () => void
  readColumnWidth: (id: string, fallback: number) => number
  previewColumnResize: (id: string, width: number) => void
  commitColumnResize: (id: string, width: number) => void
}) {
  const { tableProps: props, ...state } = args
  const { view, columnTypesById, canMutate } = props
  const canConfigure = props.canConfigure ?? canMutate
  const { themeTokens, styles, components, helpers, icons } = useTableHost()
  const { menuIconActionClass, dataViewMenuPanelClass } = styles
  const { NestedRowsBulkToggle, ColumnHeaderPropertyTypeMenu, ColumnHeaderMenu, ColumnTypeMenu, ColumnResizeHandle, AddColumnMenu } = components
  const { readDefaultColumnWidth } = helpers
  const { iconByColumnType } = icons
  const { visibleColumnMeta, hasNestedRowHierarchy, hierarchyColumnWidthPx, headerPaddingClassName,
    areAllNestedRowsCollapsed, toggleAllNestedRows, multiRowSelectionEnabled, allRowsSelected,
    someRowsSelected, toggleAllRows, readColumnWidth, previewColumnResize, commitColumnResize } = state
  return (
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
  )
}
