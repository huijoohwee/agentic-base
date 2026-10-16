import React from 'react'
import './dashboardWidgetSection.css'

export type DashboardWidgetSectionProps = {
  id: string
  title: React.ReactNode
  description?: React.ReactNode
  expanded: boolean
  visible?: boolean
  children: React.ReactNode
}

/** Shared dashboard section shell; the host supplies heading, visibility, and expansion state. */
export function DashboardWidgetSection({
  id, title, description, expanded, visible = true, children,
}: DashboardWidgetSectionProps) {
  if (!visible) return null
  return <section className="agentic-base-dashboard-section" data-agentic-base-dashboard-section={id}>
    <header className="agentic-base-dashboard-section-header">{title}
      {description ? <p hidden={!expanded} className="agentic-base-dashboard-section-description">{description}</p> : null}
    </header>
    <section hidden={!expanded} data-agentic-base-dashboard-section-content="true">{children}</section>
  </section>
}
