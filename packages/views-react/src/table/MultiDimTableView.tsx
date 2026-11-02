import React from 'react'
import type { ReactNode } from 'react'
import { TableView, type TableViewProps } from './TableView'

export type MultiDimTableViewProps = TableViewProps & {
  graphEnabled?: boolean
  renderGraphOverlay?: (view: TableViewProps['view']) => ReactNode
  showPivotControl?: boolean
  onOrientationChange?: (orientation: NonNullable<TableViewProps['orientation']>) => void
}

/** Multi-dimensional table uses the one canonical Table grid; graph overlays stay host-owned. */
export const MultiDimTableView = React.memo(function MultiDimTableView(props: MultiDimTableViewProps) {
  const { graphEnabled = false, renderGraphOverlay, showPivotControl = false, onOrientationChange, ...tableProps } = props
  const overlay = graphEnabled ? renderGraphOverlay?.(props.view) : null
  const orientation = tableProps.orientation ?? 'rows'
  const orientationLabel = orientation === 'columns' ? 'columns as records' : 'rows as records'
  return <section className="base-multi-dimensional-table min-w-0">
    {showPivotControl && onOrientationChange ? <div className="base-multi-dimensional-table-toolbar">
      <button
        type="button"
        className="base-multi-dimensional-table-pivot"
        aria-label={`Current table orientation: ${orientationLabel}`}
        aria-pressed={orientation === 'columns'}
        onClick={() => onOrientationChange(orientation === 'columns' ? 'rows' : 'columns')}
      >Pivot: {orientationLabel}</button>
    </div> : null}
    {overlay ? <section className="base-multi-dimensional-table-overlay" aria-label="Table overlay">{overlay}</section> : null}
    <TableView {...tableProps} tableFit={tableProps.tableFit ?? 'container'} />
  </section>
})

export { createBaseTableHost } from './BaseTableHost'
