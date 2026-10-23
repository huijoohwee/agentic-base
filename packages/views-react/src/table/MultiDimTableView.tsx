import React from 'react'
import type { ReactNode } from 'react'
import { TableView, type TableViewProps } from './TableView'

export type MultiDimTableViewProps = TableViewProps & {
  graphEnabled?: boolean
  renderGraphOverlay?: (view: TableViewProps['view']) => ReactNode
}

/** Multi-dimensional table uses the one canonical Table grid; graph overlays stay host-owned. */
export const MultiDimTableView = React.memo(function MultiDimTableView(props: MultiDimTableViewProps) {
  const { graphEnabled = false, renderGraphOverlay, ...tableProps } = props
  const overlay = graphEnabled ? renderGraphOverlay?.(props.view) : null
  return <section className="base-multi-dimensional-table min-w-0">
    {overlay ? <div className="base-multi-dimensional-table-overlay">{overlay}</div> : null}
    <TableView {...tableProps} />
  </section>
})

export { createBaseTableHost } from './BaseTableHost'
