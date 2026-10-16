import React from 'react'
import './settingsSectionHeader.css'

export type SettingsSectionHeaderProps = {
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
  title, actions, ariaLabel, fontClassName = '', className = '', titleClassName = '', actionsClassName = '',
}: SettingsSectionHeaderProps) {
  return <header aria-label={ariaLabel} className={[
    'agentic-base-settings-section-header', fontClassName, className,
  ].filter(Boolean).join(' ')}>
    <section className={[
      'agentic-base-settings-section-header-title', titleClassName,
    ].filter(Boolean).join(' ')}>{title}</section>
    {actions != null ? <section className={[
      'agentic-base-settings-section-header-actions', actionsClassName,
    ].filter(Boolean).join(' ')}>{actions}</section> : null}
  </header>
}
