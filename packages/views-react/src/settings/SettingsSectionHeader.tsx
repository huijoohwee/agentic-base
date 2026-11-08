import React from 'react'
import './settingsSectionHeader.css'

export type SettingsSectionHeaderProps = Omit<React.HTMLAttributes<HTMLElement>, 'title' | 'children'> & {
  title: React.ReactNode
  actions?: React.ReactNode
  ariaLabel?: string
  fontClassName?: string
  className?: string
  titleClassName?: string
  actionsClassName?: string
}

/** Shared MainPanel section heading; hosts supply labels, actions, and typography. */
export function SettingsSectionHeader({
  title, actions, ariaLabel, fontClassName = '', className = '', titleClassName = '', actionsClassName = '', ...headerProps
}: SettingsSectionHeaderProps) {
  return <header {...headerProps} aria-label={ariaLabel ?? headerProps['aria-label']} className={[
    'agentic-panel-section-header agentic-base-settings-section-header', fontClassName, className,
  ].filter(Boolean).join(' ')}>
    <section className={[
      'agentic-panel-section-title agentic-base-settings-section-header-title', titleClassName,
    ].filter(Boolean).join(' ')}>{title}</section>
    {actions != null ? <section className={[
      'agentic-panel-section-actions agentic-base-settings-section-header-actions', actionsClassName,
    ].filter(Boolean).join(' ')}>{actions}</section> : null}
  </header>
}
