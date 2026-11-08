import React from 'react'
import type { DashboardWidgetDataAttributes } from './DashboardWidgetCards'
import './dashboardCanvasLayout.css'

export type DashboardCanvasLayoutProps = DashboardWidgetDataAttributes & {
  ariaLabel?: string
  beforeHeader?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  hero?: React.ReactNode
  observation?: React.ReactNode
  overview?: React.ReactNode
  insights?: React.ReactNode
  metrics?: React.ReactNode
  sections?: React.ReactNode
  children?: React.ReactNode
  metricsAttributes?: DashboardWidgetDataAttributes
  sectionsAttributes?: DashboardWidgetDataAttributes
  className?: string
}

/** Shared responsive dashboard content layout; consumers supply all data and actions. */
export function DashboardCanvasLayout({
  ariaLabel = 'Dashboard content', beforeHeader, title, description, hero, observation, overview, insights, metrics, sections, children, metricsAttributes, sectionsAttributes, className = '', ...rootAttributes
}: DashboardCanvasLayoutProps) {
  return <section className={['agentic-dashboard-layout agentic-base-dashboard-layout', className].filter(Boolean).join(' ')} aria-label={ariaLabel}
    data-agentic-base-dashboard-layout="true" {...rootAttributes}>
    {beforeHeader}
    <header className="agentic-dashboard-header agentic-base-dashboard-layout-header">
      <section className="agentic-base-dashboard-layout-heading">
        {title}
        {description ? <div className="agentic-base-dashboard-layout-description">{description}</div> : null}
      </section>
      {hero ? <section className="agentic-dashboard-hero agentic-base-dashboard-layout-hero" aria-label="Dashboard highlight">{hero}</section> : null}
    </header>
    {observation ? <p className="agentic-dashboard-observation agentic-base-dashboard-layout-observation">{observation}</p> : null}
    {overview ? <section className="agentic-base-dashboard-layout-overview">{overview}</section> : null}
    {insights}
    {metrics ? <section className="agentic-base-dashboard-layout-metrics" aria-label="Dashboard metrics" {...metricsAttributes}>{metrics}</section> : null}
    {sections ? <section className="agentic-dashboard-sections agentic-base-dashboard-layout-sections" {...sectionsAttributes}>{sections}</section> : null}
    {children}
  </section>
}
