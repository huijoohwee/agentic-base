import React from 'react'
import { ArrowDownUp, ChevronLeft, ChevronRight, Columns3, Filter, Layers, LayoutGrid, Search, Table2 } from 'lucide-react'
import { TableToolbar } from 'agentic-design-system/react/viewer'
import { mountBrowserView } from './mountBrowserView'

const layouts = { table: ['Table', Table2], multiDimensional: ['Multi-dimensional table', Layers], kanban: ['Kanban', Columns3] } as const
const actions = { search: Search, filter: Filter, sort: ArrowDownUp, previous: ChevronLeft, next: ChevronRight }
type Layout = keyof typeof layouts
type Action = { id: keyof typeof actions; label: string; pressed?: boolean; disabled?: boolean; invoke: () => void }
export type RecordViewToolbarState = {
  label: string; layout: Layout; onLayoutChange: (layout: Layout) => void
  actions: readonly Action[]; status?: string
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
  return { ...input, actions: controls }
}

function Controls({ state }: { state: RecordViewToolbarState }) {
  const [name, Icon] = layouts[state.layout]
  return <div className="base-record-controls"><TableToolbar label={state.label}>
    <label className="base-layout-picker" title={'View layout · ' + name}>
      <LayoutGrid aria-hidden="true" /><Icon aria-hidden="true" />
      <select aria-label="View layout" value={state.layout} onChange={event => state.onLayoutChange(event.target.value as Layout)}>
        {Object.entries(layouts).map(([value, [label]]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    <span role="status" className="base-record-count">{state.status}</span>
    {state.actions.map(action => {
      const Glyph = actions[action.id]
      return <button key={action.id} type="button" aria-label={action.label} title={action.label} disabled={action.disabled}
        aria-pressed={action.pressed} onClick={action.invoke}><Glyph aria-hidden="true" /></button>
    })}
  </TableToolbar></div>
}

/** A compact Design System toolbar for switching Base views and invoking consumer-owned actions. */
export function mountRecordViewToolbar(target: HTMLElement, initial: RecordViewToolbarState) {
  return mountBrowserView(target, initial, snapshot, state => <Controls state={state} />)
}
