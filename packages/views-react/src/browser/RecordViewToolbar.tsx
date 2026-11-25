import React from 'react'
import { ArrowDownUp, ChevronLeft, ChevronRight, Columns3, Download, Filter, Layers, LayoutGrid, Search, Table2 } from 'lucide-react'
import { TableToolbar } from 'agentic-design-system/react/viewer'
import { mountBrowserView } from './mountBrowserView'

const layouts = { table: ['Table', Table2], multiDimensional: ['Multi-dimensional table', Layers], kanban: ['Kanban', Columns3] } as const
const actions = { search: Search, filter: Filter, sort: ArrowDownUp, previous: ChevronLeft, next: ChevronRight }
type ExportAction = { id: string; label: string; invoke: () => void }
type Layout = keyof typeof layouts
type Action = { id: keyof typeof actions; label: string; pressed?: boolean; disabled?: boolean; invoke: () => void }
export type RecordViewToolbarState = {
  label: string; layout: Layout; onLayoutChange: (layout: Layout) => void
  actions: readonly Action[]; status?: string; exports?: readonly ExportAction[]
}

function snapshot(input: RecordViewToolbarState): RecordViewToolbarState {
  if (!input || !Object.hasOwn(layouts, input.layout) || typeof input.onLayoutChange !== 'function'
    || typeof input.label !== 'string' || !input.label.trim() || input.label.length > 256
    || (input.status !== undefined && (typeof input.status !== 'string' || input.status.length > 256))
    || !Array.isArray(input.actions) || input.actions.length > Object.keys(actions).length) throw new TypeError('Invalid record toolbar.')
  const ids = new Set<string>()
  const controls = input.actions.map(action => {
    if (!action || !Object.hasOwn(actions, action.id) || ids.has(action.id) || typeof action.invoke !== 'function'
      || typeof action.label !== 'string' || !action.label.trim() || action.label.length > 128
      || (action.pressed !== undefined && typeof action.pressed !== 'boolean')
      || (action.disabled !== undefined && typeof action.disabled !== 'boolean')) throw new TypeError('Invalid record toolbar action.')
    ids.add(action.id)
    return { ...action }
  })
  if (input.exports !== undefined && !Array.isArray(input.exports)) throw new TypeError('Invalid export actions.')
  const exportIds = new Set<string>()
  const exports = input.exports?.map(action => {
    if (!action || typeof action.id !== 'string' || !action.id.trim() || exportIds.has(action.id)
      || typeof action.label !== 'string' || !action.label.trim() || typeof action.invoke !== 'function') throw new TypeError('Invalid export action.')
    exportIds.add(action.id)
    return { ...action }
  })
  return { ...input, actions: controls, exports }
}

function Controls({ state }: { state: RecordViewToolbarState }) {
  const [name, Icon] = layouts[state.layout]
  const [exportOpen, setExportOpen] = React.useState(false)
  const [error, setError] = React.useState('')
  const trigger = React.useRef<HTMLButtonElement>(null)
  const panelId = React.useId()
  function closeExport() { setExportOpen(false); trigger.current?.focus() }
  function save(action: ExportAction) {
    try { action.invoke(); closeExport() }
    catch { setError('Could not export this view.') }
  }
  return <div className="base-record-controls"><TableToolbar label={state.label}>
    <label className="base-layout-picker" title={'View layout · ' + name}>
      <LayoutGrid aria-hidden="true" /><Icon aria-hidden="true" />
      <select aria-label="View layout" value={state.layout} onChange={event => state.onLayoutChange(event.target.value as Layout)}>
        {Object.entries(layouts).map(([value, [label]]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    <span role="status" className="base-record-count">{state.status}</span>
    {Boolean(state.exports?.length) && <button ref={trigger} type="button" title="Export view" aria-label="Export view"
      aria-expanded={exportOpen} aria-controls={panelId} onClick={() => { setError(''); setExportOpen(!exportOpen) }}>
      <Download aria-hidden="true" />
    </button>}
    {state.actions.map(action => {
      const Glyph = actions[action.id]
      return <button key={action.id} type="button" aria-label={action.label} title={action.label} disabled={action.disabled}
        aria-pressed={action.pressed} onClick={action.invoke}><Glyph aria-hidden="true" /></button>
    })}
  </TableToolbar>
    {Boolean(state.exports?.length) && exportOpen && <div id={panelId} role="group" aria-label="Export format"
      className="agentic-record-actions" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); closeExport() } }}>
      {state.exports?.map((action, index) => <button key={action.id} type="button"
        autoFocus={index === 0} onClick={() => save(action)}>{action.label}</button>)}
      {error && <span role="alert">{error}</span>}
    </div>}
  </div>
}

/** A compact Design System toolbar for switching Base views and invoking consumer-owned actions. */
export function mountRecordViewToolbar(target: HTMLElement, initial: RecordViewToolbarState) {
  return mountBrowserView(target, initial, snapshot, state => <Controls state={state} />)
}
