import React from 'react'

export type TableCoreColumn = { id: string; width: number }

/** Shared table structure for row, column, and matrix views. The host supplies theme classes and cells. */
export function TableCore<Row>(props: {
  columns: readonly TableCoreColumn[]
  header: React.ReactNode
  rows: React.ReactNode
  frameClassName: string
  headerClassName: string
  bodyClassName: string
  tableClassName?: string
  tableStyle?: React.CSSProperties
  ariaLabel?: string
  beforeRows?: React.ReactNode
  afterRows?: React.ReactNode
  children?: React.ReactNode
}) {
  const label = props.ariaLabel ?? 'Table view'
  return (
    <section className={`${props.frameClassName} isolate`} aria-label={label}>
      <table aria-label={label} className={`${props.tableClassName ?? 'min-w-max w-max'} table-fixed border-separate border-spacing-0 text-xs`} style={props.tableStyle}>
        <colgroup>{props.columns.map(column => <col key={column.id} style={{ width: column.width }} />)}</colgroup>
        <thead className={`${props.headerClassName} sticky top-0 z-30 isolate`}>
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
