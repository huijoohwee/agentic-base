import React from 'react'
import { PanelTabHeader, PanelScrollRegion } from 'agentic-design-system/react/panels'

export type SettingsPanelShellProps = {
  ariaLabel: string
  title: React.ReactNode
  summary?: React.ReactNode
  children: React.ReactNode
}

/** Settings content uses the same tab header and scrolling body as every other panel. */
export function SettingsPanelShell({ ariaLabel, title, summary, children }: SettingsPanelShellProps) {
  return <section aria-label={ariaLabel} className="agentic-panel-tab-layout">
    <PanelTabHeader title={title} subtitle={summary != null ? <span aria-label="Selection summary">{summary}</span> : undefined} />
    <PanelScrollRegion aria-label={`${ariaLabel} content`} className="agentic-panel-tab-body">{children}</PanelScrollRegion>
  </section>
}
