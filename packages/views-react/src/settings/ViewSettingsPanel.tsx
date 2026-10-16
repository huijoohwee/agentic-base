import React from 'react'
import { CalendarDays, Grid2X2, KanbanSquare, Table2 } from 'lucide-react'
import { LayoutChoice, SettingsPanelShell, WorkspaceDataViewComfortableTextInput, WorkspaceDataViewCompactCheckbox, WorkspaceDataViewFieldSelect } from './SettingsPrimitives'

export type ViewLayout = 'table' | 'multiDimTable' | 'kanban' | 'calendar'
export type SavedViewOption = { id: string; name: string; layout: ViewLayout }

const layouts: Array<{ id: ViewLayout; label: string; icon: React.ReactNode }> = [
  { id: 'table', label: 'Table View', icon: <Table2 className="h-5 w-5" aria-hidden="true" /> },
  { id: 'multiDimTable', label: 'Multi-dimensional Table', icon: <Grid2X2 className="h-5 w-5" aria-hidden="true" /> },
  { id: 'kanban', label: 'Kanban View', icon: <KanbanSquare className="h-5 w-5" aria-hidden="true" /> },
  { id: 'calendar', label: 'Calendar View', icon: <CalendarDays className="h-5 w-5" aria-hidden="true" /> },
]

export type ViewSettingsPanelProps = {
  ariaLabel?: string
  contextLabel: string
  savedViews: readonly SavedViewOption[]
  activeViewId: string
  viewName: string
  layout: ViewLayout
  graphEnabled?: boolean
  rowHeight?: 'compact' | 'comfortable'
  fieldLineMode?: 'single' | 'double' | 'flex'
  onSelectSavedView: (viewId: string) => void
  onChangeName: (name: string) => void
  onChangeLayout: (layout: ViewLayout) => void
  onChangeGraphEnabled?: (enabled: boolean) => void
  onChangeRowHeight?: (height: 'compact' | 'comfortable') => void
  onChangeFieldLineMode?: (mode: 'single' | 'double' | 'flex') => void
  onDuplicateView?: () => void
  onDeleteView?: () => void
  children?: React.ReactNode
}

const actionClass = 'rounded border px-2 py-1 text-xs'

/** Shared saved-view and layout controls. Consumers supply field schemas and domain-specific sections. */
export function ViewSettingsPanel(props: ViewSettingsPanelProps) {
  const active = props.savedViews.find(view => view.id === props.activeViewId)
  return <SettingsPanelShell
    ariaLabel={props.ariaLabel ?? 'View settings'}
    title={<strong>View</strong>}
    summary={props.contextLabel}
  >
    <section aria-label="Saved view settings" className="space-y-3">
      <label className="grid min-w-0 gap-1 text-xs">
        Saved view
        <WorkspaceDataViewFieldSelect
          aria-label="Saved view"
          value={props.activeViewId}
          onValueChange={props.onSelectSavedView}
        >
          {props.savedViews.map(view => <option key={view.id} value={view.id}>{view.name}</option>)}
        </WorkspaceDataViewFieldSelect>
      </label>
      <div className="flex flex-wrap gap-2">
        {props.onDuplicateView ? <button type="button" className={actionClass} onClick={props.onDuplicateView}>Duplicate view</button> : null}
        {props.onDeleteView ? <button type="button" className={actionClass} disabled={props.savedViews.length < 2} onClick={props.onDeleteView}>Delete view</button> : null}
      </div>
      <p className="m-0 text-xs">Keep at least one view.</p>
      <label className="grid min-w-0 gap-1 text-xs">
        View name
        <WorkspaceDataViewComfortableTextInput aria-label="View name" value={props.viewName}
          onChange={event => props.onChangeName(event.target.value)} maxLength={120} />
      </label>
      <section aria-label="Layout" className="space-y-2">
        <h3 className="m-0 text-xs font-semibold">Layout</h3>
        <div role="group" aria-label="View layout" className="flex min-w-0 gap-2 overflow-x-auto pb-1">
          {layouts.map(option => <LayoutChoice key={option.id} active={props.layout === option.id} label={option.label}
            icon={option.icon} onClick={() => props.onChangeLayout(option.id)} />)}
        </div>
      </section>
      {props.layout === 'multiDimTable' && props.onChangeGraphEnabled ? <label className="flex min-w-0 items-center gap-2 text-sm">
        <WorkspaceDataViewCompactCheckbox aria-label="Enable graph rendering" checked={Boolean(props.graphEnabled)}
          onChange={event => props.onChangeGraphEnabled?.(event.target.checked)} />
        <span>Enable graph rendering</span>
      </label> : null}
      {props.onChangeRowHeight ? <section aria-label="Density" className="space-y-2">
        <h3 className="m-0 text-xs font-semibold">Density</h3>
        <div role="group" aria-label="Row height" className="flex gap-2">
          {(['compact', 'comfortable'] as const).map(value => <button type="button" key={value} className={actionClass}
            aria-pressed={(props.rowHeight ?? 'comfortable') === value} onClick={() => props.onChangeRowHeight?.(value)}>
            {value === 'compact' ? 'Compact' : 'Comfortable'}
          </button>)}
        </div>
      </section> : null}
      {props.onChangeFieldLineMode ? <section aria-label="Field line" className="space-y-2">
        <h3 className="m-0 text-xs font-semibold">Field line</h3>
        <div role="group" aria-label="Field line mode" className="flex gap-2">
          {(['single', 'double', 'flex'] as const).map(value => <button type="button" key={value} className={actionClass}
            aria-pressed={(props.fieldLineMode ?? 'single') === value} onClick={() => props.onChangeFieldLineMode?.(value)}>
            {value === 'single' ? 'Single line' : value === 'double' ? 'Two lines' : 'Flex'}
          </button>)}
        </div>
      </section> : null}
      {active ? <p className="m-0 text-xs" aria-live="polite">Selected: {active.name}</p> : null}
    </section>
    {props.children ? <section aria-label="Layout-specific settings" className="mt-4 space-y-4">{props.children}</section> : null}
  </SettingsPanelShell>
}
