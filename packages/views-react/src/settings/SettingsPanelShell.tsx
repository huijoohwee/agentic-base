import React from 'react'
import './settingsPanelShell.css'

export type SettingsPanelShellProps = {
  ariaLabel: string
  title: React.ReactNode
  summary?: React.ReactNode
  children: React.ReactNode
  className?: string
  headerClassName?: string
  bodyClassName?: string
}

/** Shared settings panel frame; the consumer supplies labels, values, and field actions. */
export function SettingsPanelShell({
  ariaLabel, title, summary, children, className = '', headerClassName = '', bodyClassName = '',
}: SettingsPanelShellProps) {
  return <section aria-label={ariaLabel} className={['agentic-base-settings-panel', className].filter(Boolean).join(' ')}>
    <header className={['agentic-base-settings-panel-header', headerClassName].filter(Boolean).join(' ')}>
      <section className="agentic-base-settings-panel-title">{title}</section>
      {summary != null ? <section className="agentic-base-settings-panel-summary" aria-label="Selection summary">{summary}</section> : null}
    </header>
    <section className={['agentic-base-settings-panel-body', bodyClassName].filter(Boolean).join(' ')}>{children}</section>
  </section>
}
