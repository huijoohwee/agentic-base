import React from 'react'
import { WorkspaceDataViewComfortableTextInput, WorkspaceDataViewFieldSelect } from '../settings/SettingsPrimitives'
import { useSettingsHost } from '../settings/SettingsHostContext'

export type DashboardLayoutOption = { id: string; label: string }

export type DashboardWidgetLayoutSettingsProps = {
  options: readonly DashboardLayoutOption[]
  selectedId: string
  onSelectedIdChange: (id: string) => void
  columns: number
  onColumnsChange: (columns: number) => void
  rowCount: number
  widgetCount: number
  applyDisabled?: boolean
  onApply: () => void
  statusMessage?: React.ReactNode
  children?: React.ReactNode
}

/** Shared Dashboard layout controls; the host owns available layouts, state, and persistence. */
export function DashboardWidgetLayoutSettings({
  options, selectedId, onSelectedIdChange, columns, onColumnsChange, rowCount, widgetCount,
  applyDisabled = false, onApply, statusMessage, children,
}: DashboardWidgetLayoutSettingsProps) {
  const { theme } = useSettingsHost()
  return <details className={`rounded border ${theme.panel.border} p-3`} open>
    <summary className={`text-sm font-semibold ${theme.text.primary}`}>Rows and columns</summary>
    <p className={`my-2 text-xs ${theme.text.secondary}`}>Apply columns here or drag beside a card. Both save the same layout.</p>
    <label className={`block text-xs ${theme.text.primary}`}>Container
      <WorkspaceDataViewFieldSelect aria-label="Layout container" className={`my-1 w-full rounded border ${theme.panel.border} ${theme.input.bg} p-2 ${theme.input.text}`}
        value={selectedId} onValueChange={onSelectedIdChange}>
        {options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
      </WorkspaceDataViewFieldSelect>
    </label>
    <label className={`block text-xs ${theme.text.primary}`}>Columns
      <WorkspaceDataViewComfortableTextInput aria-label="Layout columns" type="number" min={1} max={12}
        className="my-1 w-full p-2" value={columns} onChange={event => onColumnsChange(Number(event.target.value))} />
    </label>
    <p className={`text-xs ${theme.text.secondary}`}>{rowCount} rows · {widgetCount} widgets</p>
    <button type="button" className={`my-2 rounded border ${theme.panel.border} ${theme.button.hoverBg} px-3 py-2 text-xs`}
      disabled={applyDisabled || !Number.isInteger(columns) || columns < 1 || columns > 12} onClick={onApply}>Apply columns</button>
    {children}
    {statusMessage ? <p role="status" className={`text-xs ${theme.text.secondary}`}>{statusMessage}</p> : null}
  </details>
}
