import React from 'react'
import { Search } from 'lucide-react'
import { SettingsSectionHeader } from './SettingsSectionHeader'
import './fieldWorkbench.css'

export type FieldWorkbenchProps = {
  ariaLabel: string
  toolbar?: React.ReactNode
  listLabel: string
  listSummary?: React.ReactNode
  listContent: React.ReactNode
  detailLabel: string
  detailContent: React.ReactNode
  className?: string
}

/** Shared Workflow Manager split layout; hosts own field models, editing, and actions. */
export function FieldWorkbench({
  ariaLabel, toolbar, listLabel, listSummary, listContent, detailLabel, detailContent, className = '',
}: FieldWorkbenchProps) {
  return <section aria-label={ariaLabel} className={['agentic-base-field-workbench', className].filter(Boolean).join(' ')}>
    {toolbar ? <div className="agentic-base-field-workbench-toolbar">{toolbar}</div> : null}
    <div className="agentic-base-field-workbench-split">
      <section className="agentic-base-field-workbench-list" aria-label={listLabel}>
        <SettingsSectionHeader className="agentic-base-field-workbench-list-header" title={listLabel}
          actions={listSummary != null ? <span className="agentic-base-field-workbench-list-summary">{listSummary}</span> : undefined} />
        <div className="agentic-base-field-workbench-list-content">{listContent}</div>
      </section>
      <section className="agentic-base-field-workbench-detail" aria-label={detailLabel}>
        <SettingsSectionHeader className="agentic-base-field-workbench-detail-header" title={detailLabel} />
        <div className="agentic-base-field-workbench-detail-content">{detailContent}</div>
      </section>
    </div>
  </section>
}

export function FieldWorkbenchSearch({
  value, onChange, placeholder = 'Search fields…', ariaLabel = 'Search fields',
}: { value: string; onChange: (value: string) => void; placeholder?: string; ariaLabel?: string }) {
  return <label className="agentic-base-field-workbench-search">
    <Search size={16} aria-hidden="true" />
    <input aria-label={ariaLabel} type="search" value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} />
  </label>
}

export function FieldWorkbenchGroup({ title, count, children }: { title: React.ReactNode; count?: React.ReactNode; children: React.ReactNode }) {
  return <section className="agentic-base-field-workbench-group">
    <header><strong>{title}</strong>{count != null ? <span>{count}</span> : null}</header>
    <div>{children}</div>
  </section>
}

export function FieldWorkbenchItem({
  label, type, description, icon, selected = false, onSelect,
}: { label: React.ReactNode; type?: React.ReactNode; description?: React.ReactNode; icon?: React.ReactNode; selected?: boolean; onSelect?: () => void }) {
  return <button type="button" aria-pressed={selected} className="agentic-base-field-workbench-item" onClick={onSelect}>
    <span className="agentic-base-field-workbench-item-icon" aria-hidden="true">{icon ?? 'T'}</span>
    <span className="agentic-base-field-workbench-item-copy"><span>{label}</span>{description != null ? <small>{description}</small> : null}</span>
    {type != null ? <span className="agentic-base-field-workbench-item-type">{type}</span> : null}
  </button>
}
