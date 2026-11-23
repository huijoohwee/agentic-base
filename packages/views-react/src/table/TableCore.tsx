import React from 'react'
import 'agentic-design-system/collection-layout.css'
import { bindStickyHierarchy } from './stickyHierarchy'

export type TableCoreColumn = { id: string; width: number }

/** Shared table structure for row, column, and matrix views. The host supplies theme classes and cells. */
export function TableCore<Row>(props: {
  columns: readonly TableCoreColumn[]
  header: React.ReactNode
  rows: React.ReactNode
  frameClassName: string
  bodyClassName: string
  tableFit?: 'content' | 'container'
  tableStyle?: React.CSSProperties
  ariaLabel?: string
  beforeRows?: React.ReactNode
  afterRows?: React.ReactNode
  children?: React.ReactNode
}) {
  const label = props.ariaLabel ?? 'Table view'
  const contentWidth = props.columns.reduce((sum, column) => sum + column.width, 0)
  const tableStyle = { ...props.tableStyle, '--agentic-table-content-size': `${contentWidth}px` } as React.CSSProperties
  const frameRef = React.useRef<HTMLElement>(null)
  React.useLayoutEffect(() => frameRef.current ? bindStickyHierarchy(frameRef.current) : undefined, [])
  return (
    <section ref={frameRef} className={`agentic-table-frame ${props.frameClassName} isolate`} aria-label={label}>
      <table aria-label={label} data-agentic-table-fit={props.tableFit ?? 'content'}
        className="agentic-base-data-table table-fixed border-separate border-spacing-0 text-xs" style={tableStyle}>
        <colgroup>{props.columns.map(column => <col key={column.id} style={{ width: column.width }} />)}</colgroup>
        <thead className="agentic-table-head">
          {props.header}
        </thead>
        <tbody className={props.bodyClassName}>
          {props.beforeRows}
          {props.rows}
          {props.afterRows}
        </tbody>
      </table>
      {props.children}
    </section>
  )
}
