import React from 'react'
import {
  WorkspaceDataViewComfortableTextInput,
  WorkspaceDataViewCompactCheckbox,
  WorkspaceDataViewFieldSelect,
} from '../settings/SettingsPrimitives'
import { useSettingsHost } from '../settings/SettingsHostContext'

export type DashboardWidgetEditorOption = { value: string; label: string }
export type DashboardWidgetEditorValue = string | number | boolean | readonly string[]
type DashboardWidgetEditorFieldBase = { id: string; label: string }

export type DashboardWidgetEditorField =
  | (DashboardWidgetEditorFieldBase & { type: 'text' | 'textarea'; value: string; maxLength?: number })
  | (DashboardWidgetEditorFieldBase & { type: 'number'; value: number; min?: number; max?: number; step?: number })
  | (DashboardWidgetEditorFieldBase & { type: 'select'; value: string; options: readonly DashboardWidgetEditorOption[] })
  | (DashboardWidgetEditorFieldBase & { type: 'checkbox'; checked: boolean })
  | (DashboardWidgetEditorFieldBase & { type: 'checkbox-list'; value: readonly string[]; options: readonly DashboardWidgetEditorOption[] })
  | (DashboardWidgetEditorFieldBase & { type: 'custom'; content: React.ReactNode })

export type DashboardWidgetEditorProps = {
  title: string
  fields: readonly DashboardWidgetEditorField[]
  onFieldChange: (fieldId: string, value: DashboardWidgetEditorValue) => void
  onSave: () => void
  onClose: () => void
  saveLabel: string
  busy?: boolean
  ready?: boolean
  error?: React.ReactNode
  hostError?: React.ReactNode
  removeLabel?: string
  onRemove?: () => void
  beforeFields?: React.ReactNode
  className?: string
}

export function DashboardWidgetEditor({
  title, fields, onFieldChange, onSave, onClose, saveLabel, busy = false, ready = true,
  error, hostError, removeLabel, onRemove, beforeFields, className = '',
}: DashboardWidgetEditorProps) {
  const { theme } = useSettingsHost()
  const closeButton = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => { closeButton.current?.focus({ preventScroll: true }) }, [])
  const inputClassName = `w-full min-w-0 rounded border ${theme.input.border} ${theme.input.bg} px-2 py-1.5 text-xs ${theme.input.text}`
  return <section aria-label="Widget settings" className={`agentic-base-dashboard-widget-editor h-full min-h-0 min-w-0 overflow-y-auto overscroll-contain space-y-3 rounded-lg border ${theme.panel.border} p-4 shadow-none ${className}`}
    style={{ background: 'var(--agentic-base-dashboard-panel-bg, #fff)' }}
    onKeyDown={event => { if (event.key === 'Escape' && !busy) { event.preventDefault(); onClose() } }}>
    <header className="flex items-center justify-between gap-2">
      <h2 className={`text-sm font-semibold ${theme.text.primary}`}>Configure {title}</h2>
      <button ref={closeButton} type="button" className={`rounded border ${theme.panel.border} px-2 py-1.5 text-xs ${theme.button.hoverBg}`} disabled={busy} onClick={onClose}>Cancel</button>
    </header>
    {beforeFields}
    <form aria-label="Widget configuration" className="space-y-3" onSubmit={event => { event.preventDefault(); onSave() }}>
      {fields.map(field => <React.Fragment key={field.id}>
        {field.type === 'text' || field.type === 'number' || field.type === 'textarea' ? <label className={`block text-xs ${theme.text.primary}`}>{field.label}
          {field.type === 'textarea' ? <textarea aria-label={field.label} className={inputClassName} value={field.value} maxLength={field.maxLength}
            onChange={event => onFieldChange(field.id, event.target.value)} /> : <WorkspaceDataViewComfortableTextInput aria-label={field.label} className={inputClassName}
            type={field.type} value={field.value} maxLength={field.type === 'text' ? field.maxLength : undefined}
            min={field.type === 'number' ? field.min : undefined} max={field.type === 'number' ? field.max : undefined}
            step={field.type === 'number' ? field.step : undefined}
            onChange={event => onFieldChange(field.id, field.type === 'number' ? Number(event.target.value) : event.target.value)} />}
        </label> : null}
        {field.type === 'select' ? <label className={`block text-xs ${theme.text.primary}`}>{field.label}
          <WorkspaceDataViewFieldSelect aria-label={field.label} className={inputClassName} value={field.value}
            onValueChange={value => onFieldChange(field.id, value)}>
            {field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </WorkspaceDataViewFieldSelect>
        </label> : null}
        {field.type === 'checkbox' ? <label className={`flex gap-2 text-xs ${theme.text.primary}`}>
          <WorkspaceDataViewCompactCheckbox type="checkbox" checked={field.checked} onChange={event => onFieldChange(field.id, event.target.checked)} />{field.label}
        </label> : null}
        {field.type === 'checkbox-list' ? <fieldset className={`space-y-1 text-xs ${theme.text.primary}`}>
          <legend>{field.label}</legend>{field.options.map(option => <label key={option.value} className="flex gap-2">
            <WorkspaceDataViewCompactCheckbox type="checkbox" checked={field.value.includes(option.value)}
              onChange={event => onFieldChange(field.id, event.target.checked ? [...field.value, option.value] : field.value.filter(value => value !== option.value))} />{option.label}
          </label>)}
        </fieldset> : null}
        {field.type === 'custom' ? <section aria-label={field.label}>{field.content}</section> : null}
      </React.Fragment>)}
      {error || hostError ? <p role="alert" className={`text-xs ${theme.text.secondary}`}>{error || hostError}</p> : null}
      <footer className="flex flex-wrap gap-2">
        <button type="submit" className={`rounded border ${theme.panel.border} px-2 py-1.5 text-xs ${theme.button.hoverBg}`} disabled={busy || !ready}>{saveLabel}</button>
        {onRemove ? <button type="button" className={`rounded border ${theme.panel.border} px-2 py-1.5 text-xs ${theme.button.hoverBg}`}
          disabled={busy || !ready} onClick={onRemove}>{removeLabel ?? 'Remove widget'}</button> : null}
      </footer>
    </form>
  </section>
}
