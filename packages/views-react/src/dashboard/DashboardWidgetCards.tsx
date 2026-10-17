import React from 'react'
import type { KanbanCardDragProps, KanbanCardDropProps } from '../kanban/kanbanReorder'
import { getKanbanCardDragVisualState } from '../kanban/kanbanDragVisualState'
import './dashboardWidgetCards.css'

type DashboardWidgetDragState = {
  cardDragProps?: KanbanCardDragProps
  cardDropProps?: KanbanCardDropProps
  draggingId?: string | null
  dragOverId?: string | null
  commitFlashId?: string | null
  dropPreview?: React.ReactNode
  selectionSurfaceClassName?: string
  indicatorColor?: string
  registerElement?: (id: string, element: HTMLElement | null) => void
}

/** Host-owned data attributes rendered unchanged on the shared card root. */
export type DashboardWidgetDataAttributes = {
  [attribute: `data-${string}`]: string | undefined
}

export type DashboardWidgetCardProps = DashboardWidgetDragState & {
  id: string
  label: string
  title: React.ReactNode
  subtitle?: React.ReactNode
  footnote?: React.ReactNode
  children: React.ReactNode
  canEditFootnote?: boolean
  className?: string
  dataAttributes?: DashboardWidgetDataAttributes
}

export function DashboardWidgetCard({
  id, label, title, subtitle, footnote, children, canEditFootnote = false, className = '',
  dataAttributes,
  cardDragProps = { draggable: false }, cardDropProps = {}, draggingId = null, dragOverId = null,
  commitFlashId = null, dropPreview, selectionSurfaceClassName = '',
  indicatorColor = 'var(--agentic-base-dashboard-indicator, #3b82f6)', registerElement = () => {},
}: DashboardWidgetCardProps) {
  const dragging = draggingId === id, dropTarget = dragOverId === id
  const visual = getKanbanCardDragVisualState({ hasActiveDrag: draggingId !== null, isDragging: dragging,
    isDropTarget: dropTarget, isCommitFlash: commitFlashId === id, indicatorColor })
  return <article className={['agentic-base-dashboard-card', selectionSurfaceClassName, visual.className, className].filter(Boolean).join(' ')}
    style={visual.style} ref={element => registerElement(id, element)} data-agentic-base-dashboard-card={id}
    data-agentic-base-dashboard-card-draggable={cardDragProps.draggable ? 'true' : undefined}
    tabIndex={0} role="group" aria-label={label} aria-grabbed={cardDragProps.draggable ? dragging : undefined}
    {...dataAttributes}
    {...cardDropProps} draggable={cardDragProps.draggable} onDragStart={cardDragProps.onDragStart} onDragEnd={cardDragProps.onDragEnd}>
    {dropTarget ? dropPreview : null}
    <header className="agentic-base-dashboard-card-header agentic-base-dashboard-card-drag-region" data-agentic-base-dashboard-card-drag-region>
      <section className="min-w-0" data-agentic-base-dashboard-card-title>{title}</section>
      {subtitle ? <section className="agentic-base-dashboard-card-subtitle" data-agentic-base-dashboard-card-subtitle>{subtitle}</section> : null}
    </header>
    <section className="agentic-base-dashboard-card-body" data-agentic-base-dashboard-card-body>{children}</section>
    {footnote || canEditFootnote ? <section className="agentic-base-dashboard-card-footnote" data-agentic-base-dashboard-card-footnote>{footnote}</section> : null}
  </article>
}

export type DashboardMetricTileProps = DashboardWidgetDragState & {
  id: string
  label: string
  value: React.ReactNode
  detail: React.ReactNode
  toneClassName?: string
}

export function DashboardMetricTile({
  id, label, value, detail, toneClassName = '', cardDragProps = { draggable: false }, cardDropProps = {},
  draggingId = null, dragOverId = null, commitFlashId = null, dropPreview,
  selectionSurfaceClassName = '', indicatorColor = 'var(--agentic-base-dashboard-indicator, #3b82f6)', registerElement = () => {},
}: DashboardMetricTileProps) {
  const dragging = draggingId === id, dropTarget = dragOverId === id
  const visual = getKanbanCardDragVisualState({ hasActiveDrag: draggingId !== null, isDragging: dragging,
    isDropTarget: dropTarget, isCommitFlash: commitFlashId === id, indicatorColor })
  return <section className={['agentic-base-dashboard-metric', toneClassName, selectionSurfaceClassName, visual.className].filter(Boolean).join(' ')}
    style={visual.style} data-agentic-base-dashboard-metric={id}
    data-agentic-base-dashboard-metric-draggable={cardDragProps.draggable ? 'true' : undefined}
    ref={element => registerElement(id, element)} role="group" tabIndex={0} aria-label={label}
    aria-grabbed={cardDragProps.draggable ? dragging : undefined} {...cardDropProps} draggable={cardDragProps.draggable}
    onDragStart={cardDragProps.onDragStart} onDragEnd={cardDragProps.onDragEnd}>
    {dropTarget ? dropPreview : null}
    <section className="agentic-base-dashboard-metric-content">
      <section className="agentic-base-dashboard-metric-title" data-agentic-base-dashboard-metric-title>{label}</section>
      <p className="agentic-base-dashboard-metric-value">{value}</p>
      <section className="agentic-base-dashboard-metric-detail" data-agentic-base-dashboard-metric-detail>{detail}</section>
    </section>
  </section>
}
