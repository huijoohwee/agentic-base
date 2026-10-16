import React from 'react'
import './dashboardWidgetDisclosure.css'

export type DashboardWidgetDisclosureProps = {
  id: string
  title: React.ReactNode
  children: React.ReactNode
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  className?: string
  summaryClassName?: string
}

/** Native disclosure presentation; the host owns expansion state and persistence. */
export function DashboardWidgetDisclosure({
  id, title, children, expanded, onExpandedChange, className = '', summaryClassName = '',
}: DashboardWidgetDisclosureProps) {
  return <details data-agentic-base-dashboard-disclosure={id}
    className={['agentic-base-dashboard-disclosure', className].filter(Boolean).join(' ')}
    open={expanded} onToggle={event => onExpandedChange(event.currentTarget.open)}>
    <summary className={['agentic-base-dashboard-disclosure-summary', summaryClassName].filter(Boolean).join(' ')}>{title}</summary>
    {children}
  </details>
}
