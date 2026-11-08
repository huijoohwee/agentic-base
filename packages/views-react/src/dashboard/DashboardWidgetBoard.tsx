import React from 'react'
import './dashboardWidgetBoard.css'
import type { DashboardWidgetDataAttributes } from './DashboardWidgetCards'
import type { DashboardWidgetColumnStyle } from './dashboardWidgetLayout'

export type DashboardWidgetBoardItem = { id: string; content: React.ReactNode }
export type { DashboardWidgetColumnStyle } from './dashboardWidgetLayout'
export type DashboardWidgetBoardProps = {
  id: string
  ariaLabel?: string
  items: readonly DashboardWidgetBoardItem[]
  rows: readonly (readonly string[])[]
  columnStyle: (columns: number) => DashboardWidgetColumnStyle
  laneDropProps?: React.HTMLAttributes<HTMLElement> & DashboardWidgetDataAttributes
  onItemKeyDown?: (itemId: string, event: React.KeyboardEvent<HTMLElement>) => void
  renderItem?: (item: DashboardWidgetBoardItem) => React.ReactNode
  cellAttributes?: (row: number, columns: number) => DashboardWidgetDataAttributes
  statusMessage?: string
  statusKey?: string | number
}

/** Neutral responsive board layout; drag state, persistence, and card content stay host-supplied. */
export const DashboardWidgetBoard = React.forwardRef<HTMLElement, DashboardWidgetBoardProps>(function DashboardWidgetBoard({
  id, ariaLabel, items, rows, columnStyle, laneDropProps, onItemKeyDown, renderItem, cellAttributes, statusMessage, statusKey,
}, ref) {
  const byId = new Map(items.map(item => [item.id, item]))
  const boardGap = columnStyle(1).gap
  return <section ref={ref} className="agentic-dashboard-board agentic-base-dashboard-widget-board" data-agentic-base-dashboard-board={id}
    aria-label={ariaLabel} {...laneDropProps}>
    <section className="agentic-dashboard-rows agentic-base-dashboard-widget-rows" style={{ columnGap: boardGap }}>
      {rows.flatMap((row, rowIndex) => [
        ...row.flatMap(widgetId => {
          const item = byId.get(widgetId)
          if (!item) return []
          const layout = columnStyle(row.length)
          return [<section key={widgetId} className="agentic-dashboard-cell agentic-base-dashboard-widget-cell" {...cellAttributes?.(rowIndex, row.length)}
            data-agentic-base-dashboard-row={rowIndex} data-agentic-base-dashboard-columns={row.length}
            style={{ '--agentic-base-dashboard-column-width': layout.width, marginBottom: layout.gap } as React.CSSProperties}
            onKeyDown={event => onItemKeyDown?.(widgetId, event)}>
            {renderItem ? renderItem(item) : item.content}
          </section>]
        }),
        <span key={`break:${row.at(-1) ?? rowIndex}`} className="agentic-dashboard-break agentic-base-dashboard-widget-row-break" aria-hidden="true" />,
      ])}
    </section>
    {statusMessage ? <p role="status" className="sr-only" key={statusKey}>{statusMessage}</p> : null}
  </section>
})

DashboardWidgetBoard.displayName = 'DashboardWidgetBoard'
