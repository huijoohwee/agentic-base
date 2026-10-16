import React from 'react'
import './dashboardCanvasLayout.css'

export type DashboardCanvasLayoutProps = {
  ariaLabel?: string
  title: React.ReactNode
  description?: React.ReactNode
  hero?: React.ReactNode
  observation?: React.ReactNode
  overview?: React.ReactNode
  metrics?: React.ReactNode
  sections?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

/** Shared responsive dashboard content layout; consumers supply all data and actions. */
export function DashboardCanvasLayout({
  ariaLabel = 'Dashboard content', title, description, hero, observation, overview, metrics, sections, children, className = '',
}: DashboardCanvasLayoutProps) {
  return <section className={['agentic-base-dashboard-layout', className].filter(Boolean).join(' ')} aria-label={ariaLabel}
    data-agentic-base-dashboard-layout="true">
    <header className="agentic-base-dashboard-layout-header">
      <section className="agentic-base-dashboard-layout-heading">
        {title}
        {description ? <div className="agentic-base-dashboard-layout-description">{description}</div> : null}
      </section>
      {hero ? <section className="agentic-base-dashboard-layout-hero" aria-label="Dashboard highlight">{hero}</section> : null}
    </header>
    {observation ? <p className="agentic-base-dashboard-layout-observation">{observation}</p> : null}
    {overview ? <section className="agentic-base-dashboard-layout-overview">{overview}</section> : null}
    {metrics ? <section className="agentic-base-dashboard-layout-metrics" aria-label="Dashboard metrics">{metrics}</section> : null}
    {sections ? <section className="agentic-base-dashboard-layout-sections">{sections}</section> : null}
    {children}
  </section>
}
