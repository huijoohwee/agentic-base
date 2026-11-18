import 'agentic-design-system/profile.css'
import React from 'react'
import { SettingsSectionHeader, PanelScrollRegion } from 'agentic-design-system/react/panels'
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
  return <section aria-label={ariaLabel} className={['agentic-panel-section agentic-base-settings-panel', className].filter(Boolean).join(' ')}>
    <SettingsSectionHeader stickyHeader title={title} className={['agentic-base-settings-panel-header', headerClassName].filter(Boolean).join(' ')}
      actions={summary != null ? <span className="agentic-base-settings-panel-summary" aria-label="Selection summary">{summary}</span> : undefined} />
    <PanelScrollRegion aria-label={`${ariaLabel} content`} className={['agentic-panel-section-body agentic-base-settings-panel-body', bodyClassName].filter(Boolean).join(' ')}>{children}</PanelScrollRegion>
  </section>
}
