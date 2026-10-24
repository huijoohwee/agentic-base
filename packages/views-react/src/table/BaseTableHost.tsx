import React from 'react'
import { createPortal } from 'react-dom'
import {
  BarChart3, Calendar, CheckSquare, ChevronDown, ChevronRight, ChevronsDown, ChevronsRight,
  Clock, GripVertical, Hash, Link2, ListChecks, MapPin, Paperclip, Type, User, Users,
} from 'lucide-react'
import type { ComponentType } from 'react'
import type { TableHostAdapter } from './TableHostContext'
import type { ViewRow } from '../kanban/KanbanHostContext'
import { VIEW_COLUMN_TYPE_OPTIONS } from './ViewColumnType'
import { BaseColumnHeaderMenu, BaseColumnTypeMenu } from './BaseColumnHeaderMenu'
import { readNestedRowDepth } from './rowSelection'
import { readBaseDataViewCellPaddingClassName, readBaseDataViewHeaderPaddingClassName } from './dataViewDensity'

type AnyProps = Record<string, any>
type RowState<Row extends ViewRow> = { row: Row; depth: number; childCount: number; hidden: boolean }
const neutralStoreSnapshot = Object.freeze({ workspaceCellSelectPanelPlacement: 'bottom-start' })
const iconByColumnType: Record<string, ComponentType<any>> = {
  checkbox: CheckSquare, date: Calendar, 'multi-select': ListChecks, number: Hash,
  progress: BarChart3, select: ChevronDown, link: Link2, geodata: MapPin, text: Type,
  'created-time': Clock, attachment: Paperclip, member: Users, 'created-by': User,
}

const buttonStyle: React.CSSProperties = {
  minHeight: 28, display: 'inline-flex', alignItems: 'center', gap: 6,
  border: '1px solid #d5dae2', borderRadius: 4, padding: '3px 7px',
  color: '#334155', background: '#fff', font: 'inherit', cursor: 'pointer',
}
const columnHeaderStyle: React.CSSProperties = {
  minHeight: 24, display: 'inline-flex', alignItems: 'center', gap: 6,
  minWidth: 0, maxWidth: '100%', padding: 0, border: 0, borderRadius: 0,
  color: '#172033', background: 'transparent', font: 'inherit', cursor: 'pointer',
}
const popoverStyle: React.CSSProperties = {
  position: 'absolute', zIndex: 40, top: '100%', left: 0, minWidth: 190,
  padding: 8, border: '1px solid #d5dae2', borderRadius: 6,
  background: '#fff', color: '#172033', boxShadow: '0 8px 24px #17203324',
}
const columnMenuSurfaceStyle: React.CSSProperties = {
  position: 'fixed', zIndex: 2147483647, top: 0, left: 0,
  maxWidth: 'calc(100vw - 16px)', maxHeight: 'calc(100vh - 16px)',
}

function useDismissableColumnHeaderMenu(args: {
  open: boolean
  onClose: () => void
  rootRef: React.RefObject<HTMLElement>
  triggerRef: React.RefObject<HTMLElement>
  surfaceRef: React.RefObject<HTMLElement>
}) {
  React.useEffect(() => {
    if (!args.open) return
    const ownerDocument = args.rootRef.current?.ownerDocument ?? args.triggerRef.current?.ownerDocument
    const dismissalWindow = ownerDocument?.defaultView
    if (!dismissalWindow) return
    const onPointerDown = (event: PointerEvent) => {
      const path = typeof event.composedPath === 'function' ? event.composedPath() : []
      const isSelectionHit = (target: EventTarget | null) => {
        if (!target || typeof target !== 'object' || !('nodeType' in target) || target.nodeType !== 1) return false
        const element = target as Element
        return typeof element.closest === 'function' && Boolean(element.closest('[data-kg-selection-target]'))
      }
      const hitTargets = Number.isFinite(event.clientX) && Number.isFinite(event.clientY)
        ? ownerDocument?.elementsFromPoint(event.clientX, event.clientY) ?? []
        : []
      const selectionTargets = ownerDocument?.querySelectorAll('[data-kg-selection-target]') ?? []
      const hitsSelectionTarget = [...selectionTargets].some(element => {
        const bounds = element.getBoundingClientRect()
        return bounds.width > 0 && bounds.height > 0
          && event.clientX >= bounds.left && event.clientX <= bounds.right
          && event.clientY >= bounds.top && event.clientY <= bounds.bottom
      })
      if (path.some(isSelectionHit) || isSelectionHit(event.target)
        || hitTargets.some(isSelectionHit) || hitsSelectionTarget) return
      const protectedSurfaces = [args.rootRef.current, args.triggerRef.current, args.surfaceRef.current]
      const isInsideOrOverlaid = protectedSurfaces.some(element => {
        if (!element) return false
        const pathHitsElement = path.some(target => target === element || (
          target && typeof target === 'object' && 'nodeType' in target && element.contains(target as Node)
        ))
        const target = event.target
        if (pathHitsElement || (target && typeof target === 'object' && 'nodeType' in target && element.contains(target as Node))) return true
        const bounds = element.getBoundingClientRect()
        return bounds.width > 0 && bounds.height > 0
          && event.clientX >= bounds.left && event.clientX <= bounds.right
          && event.clientY >= bounds.top && event.clientY <= bounds.bottom
      })
      const triggerBounds = args.triggerRef.current?.getBoundingClientRect()
      const dx = triggerBounds
        ? Math.max(triggerBounds.left - event.clientX, 0, event.clientX - triggerBounds.right)
        : Number.POSITIVE_INFINITY
      const dy = triggerBounds
        ? Math.max(triggerBounds.top - event.clientY, 0, event.clientY - triggerBounds.bottom)
        : Number.POSITIVE_INFINITY
      const isNearTrigger = Boolean(triggerBounds && triggerBounds.width > 0 && triggerBounds.height > 0
        && Math.hypot(dx, dy) <= 16)
      if (!isInsideOrOverlaid && !isNearTrigger) args.onClose()
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      args.onClose()
      args.triggerRef.current?.focus()
    }
    dismissalWindow.addEventListener('pointerdown', onPointerDown, true)
    dismissalWindow.addEventListener('keydown', onEscape)
    return () => {
      dismissalWindow.removeEventListener('pointerdown', onPointerDown, true)
      dismissalWindow.removeEventListener('keydown', onEscape)
    }
  }, [args.open, args.onClose, args.rootRef, args.triggerRef, args.surfaceRef])
}

function BaseTagChip({ value }: { value: string }) {
  const palette = [
    ['#f3f4f6', '#d1d5db', '#4b5563'], ['#eff6ff', '#bfdbfe', '#1d4ed8'],
    ['#fefce8', '#fde68a', '#a16207'], ['#f0fdf4', '#bbf7d0', '#15803d'],
    ['#fef2f2', '#fecaca', '#b91c1c'], ['#faf5ff', '#e9d5ff', '#6b21a8'],
    ['#fff1f2', '#fecdd3', '#9f1239'], ['#fff7ed', '#fed7aa', '#9a3412'],
  ]
  const key = value.trim().toLowerCase()
  const fixedTone = ({ todo: 0, doing: 1, done: 3, backlog: 0, wip: 1, blocked: 4, '1': 7, '2': 5, '3': 6, scalar: 4, map: 4, list: 4, pending: 7, keep: 3, remove: 4, accessibility: 1, 'brand profile': 0, token: 1, theme: 1, component: 1, guideline: 1, example: 1 } as Record<string, number>)[key]
  let hash = 0
  for (let index = 0; index < key.length; index += 1) hash = (hash * 31 + key.charCodeAt(index)) >>> 0
  const tone = palette[fixedTone ?? hash % palette.length]!
  return <span title={value} style={{ display: 'inline-flex', alignItems: 'center', minWidth: 0, maxWidth: '100%', overflow: 'hidden', padding: '2px 8px', border: `1px solid ${tone[1]}`, borderRadius: 4, background: tone[0], color: tone[2], whiteSpace: 'nowrap', fontSize: 12, lineHeight: '15px', fontWeight: 500 }}>
    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
  </span>
}

function BaseColumnHeaderPropertyTypeMenu(props: AnyProps) {
  const [open, setOpen] = React.useState(false)
  const [menuContainer, setMenuContainer] = React.useState<HTMLElement | null>(null)
  const [menuPlacement, setMenuPlacement] = React.useState<{ left: number; top: number; maxHeight: number } | null>(null)
  const [menuTheme, setMenuTheme] = React.useState<React.CSSProperties>({})
  const close = React.useCallback(() => setOpen(false), [])
  const rootRef = React.useRef<HTMLElement>(null)
  const triggerRef = React.useRef<HTMLElement>(null)
  const surfaceRef = React.useRef<HTMLElement>(null)
  useDismissableColumnHeaderMenu({ open, onClose: close, rootRef, triggerRef, surfaceRef })
  React.useLayoutEffect(() => {
    if (!open) return
    const trigger = triggerRef.current
    const surface = surfaceRef.current
    const ownerDocument = trigger?.ownerDocument
    const ownerWindow = ownerDocument?.defaultView
    if (!trigger || !surface || !ownerDocument || !ownerWindow) return
    const updatePlacement = () => {
      const anchor = trigger.getBoundingClientRect()
      const viewportWidth = Math.max(ownerDocument.documentElement.clientWidth, ownerWindow.innerWidth)
      const viewportHeight = Math.max(ownerDocument.documentElement.clientHeight, ownerWindow.innerHeight)
      const maxHeight = Math.max(80, viewportHeight - 16)
      const surfaceWidth = Math.max(190, surface.getBoundingClientRect().width)
      const surfaceHeight = Math.min(surface.scrollHeight, maxHeight)
      const left = Math.max(8, Math.min(anchor.left, viewportWidth - surfaceWidth - 8))
      const below = viewportHeight - anchor.bottom - 8
      const above = anchor.top - 8
      const top = surfaceHeight <= below || below >= above
        ? Math.min(anchor.bottom, viewportHeight - surfaceHeight - 8)
        : Math.max(8, anchor.top - surfaceHeight)
      setMenuPlacement(previous => previous?.left === left && previous.top === top && previous.maxHeight === maxHeight
        ? previous : { left, top, maxHeight })
    }
    updatePlacement()
    ownerWindow.addEventListener('resize', updatePlacement)
    ownerDocument.addEventListener('scroll', updatePlacement, true)
    const resizeObserver = typeof ownerWindow.ResizeObserver === 'function'
      ? new ownerWindow.ResizeObserver(updatePlacement)
      : null
    resizeObserver?.observe(trigger)
    resizeObserver?.observe(surface)
    return () => {
      ownerWindow.removeEventListener('resize', updatePlacement)
      ownerDocument.removeEventListener('scroll', updatePlacement, true)
      resizeObserver?.disconnect()
    }
  }, [open])
  const Icon = props.Icon ?? Type
  const openMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    const trigger = event.currentTarget
    const ownerDocument = trigger.ownerDocument
    const ownerWindow = ownerDocument.defaultView
    const computed = ownerWindow?.getComputedStyle(trigger)
    const readToken = (names: string[], fallback: string) => {
      for (const name of names) {
        const value = computed?.getPropertyValue(name).trim()
        if (value) return value
      }
      return fallback
    }
    setMenuTheme({
      '--agentic-base-menu-text': readToken(['--agentic-base-text', '--agentic-base-text-primary'], computed?.color || 'CanvasText'),
      '--agentic-base-menu-muted': readToken(['--agentic-base-muted', '--agentic-base-text-secondary', '--agentic-base-text-tertiary'], 'color-mix(in srgb, CanvasText 68%, Canvas)'),
      '--agentic-base-menu-surface': readToken(['--agentic-base-surface'], 'Canvas'),
      '--agentic-base-menu-border': readToken(['--agentic-base-border'], 'color-mix(in srgb, CanvasText 18%, Canvas)'),
      '--agentic-base-menu-hover': readToken(['--agentic-base-action-hover', '--agentic-base-selected'], 'color-mix(in srgb, CanvasText 7%, Canvas)'),
      colorScheme: computed?.colorScheme || 'light dark',
    } as React.CSSProperties)
    setMenuContainer(ownerDocument.body)
    setOpen(true)
  }
  return <span ref={rootRef} role="group" aria-label={props.ariaLabel} data-kg-selection-target="column-type-control" style={{ position: 'relative', display: 'inline-block', minWidth: 0 }}>
    <button ref={triggerRef as React.RefObject<HTMLButtonElement>} type="button" aria-label={props.ariaLabel} aria-haspopup="dialog" aria-expanded={open} data-kg-selection-target="column-menu-trigger" onClick={openMenu} style={columnHeaderStyle}>
      <Icon size={14} role="img" aria-label={`${props.label} column type`} data-kg-selection-target="column-type-icon" />
      <span data-kg-selection-target="column-type-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{props.label}</span>
      <ChevronDown size={13} color="#64748b" role="img" aria-label="Open column menu" data-kg-selection-target="column-menu-chevron" />
    </button>
    {open && menuContainer ? createPortal(<section ref={surfaceRef} role="dialog" aria-label={props.ariaLabel} data-kg-selection-target="column-menu-surface" className="agentic-base-column-menu-surface" style={{ ...columnMenuSurfaceStyle, ...menuTheme, left: menuPlacement?.left ?? 0, top: menuPlacement?.top ?? 0, maxHeight: menuPlacement?.maxHeight ?? 'calc(100vh - 16px)', visibility: menuPlacement ? 'visible' : 'hidden' }}>
      {props.menu?.({ close })}
    </section>, menuContainer) : null}
  </span>
}

function BaseAddColumnMenu(props: AnyProps) {
  const [name, setName] = React.useState('')
  const [type, setType] = React.useState('text')
  return <details style={{ position: 'relative' }}>
    <summary aria-label={props.ariaLabel} className={props.summaryClassName} style={{ ...buttonStyle, cursor: 'pointer', listStyle: 'none' }}>+</summary>
    <form style={popoverStyle} onSubmit={event => { event.preventDefault(); if (!name.trim() || !props.canMutate) return; props.onAddColumn({ name: name.trim(), columnType: type }); setName('') }}>
      <label style={{ display: 'grid', gap: 4 }}>Column name<input value={name} onChange={event => setName(event.target.value)} /></label>
      <label style={{ display: 'grid', gap: 4, marginTop: 8 }}>Type<select value={type} onChange={event => setType(event.target.value)}>{VIEW_COLUMN_TYPE_OPTIONS.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}</select></label>
      <button type="submit" style={{ ...buttonStyle, marginTop: 8 }}>Add column</button>
    </form>
  </details>
}

function BaseHierarchyCell(props: AnyProps) {
  const hasChildren = props.childCount > 0
  const isRecordRow = props.scope === 'row'
  const selectionEnabled = Boolean(props.selectable && isRecordRow)
  const selectionRef = React.useRef<HTMLInputElement>(null)
  const expandableLabel = `${props.collapsed ? 'Expand' : 'Collapse'} nested group${props.selectionLabel ? `: ${props.selectionLabel}` : ''}`
  React.useEffect(() => {
    if (selectionRef.current) selectionRef.current.indeterminate = Boolean(props.mixed)
  }, [props.mixed])
  return <td aria-label={props.scope === 'row' ? 'Row hierarchy' : 'Column record hierarchy'} className={['agentic-base-data-tree-cell', props.cellPaddingClassName].filter(Boolean).join(' ')} data-agentic-base-hierarchy-depth={props.depth} style={{
    '--agentic-base-data-tree-depth': String(props.depth),
    '--agentic-base-data-tree-indent': `${Math.max(0, Number(props.depth)) * 24}px`,
    '--agentic-base-data-tree-selection-indent': `${Math.max(0, Number(props.depth) - Number(!hasChildren)) * 24}px`,
  } as React.CSSProperties}>
    <span className="agentic-base-data-tree-control">
      {selectionEnabled && !hasChildren ? <GripVertical className="agentic-base-row-drag-handle" size={16} role="img" aria-label={`Row drag handle: ${props.selectionLabel || 'unnamed row'}`} /> : null}
      {selectionEnabled ? <label className={`agentic-base-row-select-label${hasChildren ? ' agentic-base-row-select-label-group' : ''}`} onClick={event => event.stopPropagation()}>
        <input ref={selectionRef} type="checkbox" className="agentic-base-row-select" aria-label={`${hasChildren ? 'Select group' : 'Select row'}: ${props.selectionLabel || 'unnamed row'}`} aria-checked={props.mixed ? 'mixed' : undefined} checked={Boolean(props.selected)} onChange={() => props.onSelect?.()} />
        {Number(props.rowNumber) > 0 ? <span className="agentic-base-row-index">{props.rowNumber}</span> : null}
      </label> : null}
      {hasChildren ? <button type="button" className="agentic-base-row-expand" aria-label={expandableLabel} aria-expanded={!props.collapsed} onClick={event => { event.stopPropagation(); props.onToggle() }}>
        <ChevronRight size={12} aria-label={expandableLabel} style={{ transform: props.collapsed ? undefined : 'rotate(90deg)' }} />
      </button> : null}
    </span>
  </td>
}

function BaseNestedRowsBulkToggle(props: {
  collapsed: boolean
  onToggle: () => void
  selection?: { checked: boolean; mixed: boolean; onChange: () => void }
}) {
  const Icon = props.collapsed ? ChevronsRight : ChevronsDown
  const selectAllRef = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = Boolean(props.selection?.mixed)
  }, [props.selection?.mixed])
  return <span className="agentic-base-data-tree-header-controls">
    <button type="button" className="agentic-base-nested-rows-bulk-toggle" aria-label={props.collapsed ? 'Expand all nested rows' : 'Collapse all nested rows'} aria-pressed={props.collapsed} onClick={props.onToggle}>
      <Icon size={14} aria-label={props.collapsed ? 'Expand all nested rows' : 'Collapse all nested rows'} />
    </button>
    {props.selection ? <label className="agentic-base-row-select-label agentic-base-row-select-label-header">
      <input ref={selectAllRef} type="checkbox" className="agentic-base-row-select agentic-base-row-select-all" aria-label="Select all rows" checked={props.selection.checked} onChange={props.selection.onChange} />
    </label> : null}
  </span>
}

function BaseInlineTextCellEditor(props: AnyProps) {
  const [value, setValue] = React.useState(String(props.initialValue ?? ''))
  const settled = React.useRef(false)
  const finish = (commit: boolean) => {
    if (settled.current) return
    settled.current = true
    if (commit) props.onCommit(value); else props.onCancel()
  }
  return <textarea autoFocus aria-label={props.ariaLabel} value={value} onChange={event => setValue(event.target.value)} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); finish(false) }
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); finish(true) }
  }} onBlur={() => finish(true)} style={{ width: '100%', minHeight: 32, resize: 'vertical', font: 'inherit' }} />
}

function BaseColumnResizeHandle(props: AnyProps) {
  const start = React.useRef<{ x: number; width: number } | null>(null)
  const update = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!start.current) return
    const width = Math.max(64, Math.min(640, start.current.width + event.clientX - start.current.x))
    props.onPreview(props.columnId, width)
  }
  const finish = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!start.current) return
    update(event)
    const width = Math.max(64, Math.min(640, start.current.width + event.clientX - start.current.x))
    props.onCommit(props.columnId, width)
    start.current = null
  }
  return <button type="button" role="separator" aria-orientation="vertical" aria-valuemin={64} aria-valuemax={640} aria-valuenow={props.width} aria-label={`Resize ${props.columnId}`} onPointerDown={event => { start.current = { x: event.clientX, width: props.width }; event.currentTarget.setPointerCapture(event.pointerId) }} onPointerMove={update} onPointerUp={finish} onPointerCancel={() => { start.current = null }} onKeyDown={event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const width = Math.max(64, Math.min(640, props.width + (event.key === 'ArrowRight' ? 16 : -16)))
    props.onPreview(props.columnId, width); props.onCommit(props.columnId, width)
  }} style={{ position: 'absolute', zIndex: 32, top: 0, right: -3, width: 7, height: '100%', padding: 0, border: 0, background: 'transparent', cursor: 'col-resize', touchAction: 'none' }} />
}

function BaseCellSelectPopover(props: AnyProps) {
  const meta = props.editingMeta
  if (!meta || !props.canMutate || meta.uiType === 'checkbox') return null
  const isMulti = meta.baseKind === 'multi-select'
  const options: string[] = isMulti ? props.editingMultiSelectOptions : props.editingSelectOptions
  const bounds = meta.anchorEl.getBoundingClientRect()
  const apply = (value = props.draft) => {
    props.onUpdateCell({ rowId: meta.rowId, columnId: meta.colId, nextValue: String(value ?? '') })
    props.setEditingNull()
  }
  return <section role="dialog" aria-label={`Choose ${meta.column.name}`} style={{ position: 'fixed', zIndex: 50, top: bounds.bottom + 4, left: bounds.left, minWidth: Math.max(180, bounds.width), padding: 8, border: '1px solid #d5dae2', borderRadius: 6, background: '#fff', boxShadow: '0 8px 24px #17203324' }}>
    {options.length ? <section aria-label="Available values" style={{ display: 'grid', gap: 4, maxHeight: 240, overflowY: 'auto' }}>
      {options.map(value => {
        const selected = isMulti ? props.draft.split(/[\n,]/u).map((item: string) => item.trim()).includes(value) : props.draft === value
        return <button key={value} type="button" aria-pressed={selected} onClick={() => {
          if (!isMulti) { apply(value); return }
          const next = new Set<string>(props.draft.split(/[\n,]/u).map((item: string) => item.trim()).filter(Boolean))
          if (next.has(value)) next.delete(value); else next.add(value)
          props.setDraft([...next].join(', '))
        }} style={{ ...buttonStyle, justifyContent: 'flex-start', background: selected ? '#eff6ff' : '#fff' }}>
          {selected ? <CheckSquare size={14} aria-label="Selected" /> : null}{value}
        </button>
      })}
    </section> : <input aria-label={`${meta.column.name} value`} value={props.draft} onChange={event => props.setDraft(event.target.value)} />}
    <footer style={{ display: 'flex', gap: 6, marginTop: 8 }}>
      <button type="button" style={buttonStyle} onClick={() => apply()}>Apply</button>
      <button type="button" style={buttonStyle} onClick={props.setEditingNull}>Cancel</button>
    </footer>
  </section>
}

function rowStates<Row extends ViewRow>(rows: readonly Row[], collapsedIds: ReadonlySet<string>, levelIndex?: number, indentIndex?: number): RowState<Row>[] {
  const states = rows.map(row => ({ row, depth: readNestedRowDepth(row, levelIndex, indentIndex), childCount: 0, hidden: false }))
  const collapsedDepths: number[] = []
  const ancestors: RowState<Row>[] = []
  for (const state of states) {
    while (collapsedDepths.length && collapsedDepths[collapsedDepths.length - 1]! >= state.depth) collapsedDepths.pop()
    state.hidden = collapsedDepths.length > 0
    if (collapsedIds.has(state.row.id)) collapsedDepths.push(state.depth)
    while (ancestors.length && ancestors[ancestors.length - 1]!.depth >= state.depth) ancestors.pop()
    const parent = ancestors[ancestors.length - 1]
    if (parent && parent.depth + 1 === state.depth) parent.childCount += 1
    ancestors.push(state)
  }
  return states
}

function useBaseNestedRowCollapse<Row extends ViewRow>(args: { rows: readonly Row[]; levelColumnIndex?: number; indentColumnIndex?: number }) {
  const [collapsedNestedRowIds, setCollapsedNestedRowIds] = React.useState<Set<string>>(() => new Set())
  const states = React.useMemo(() => rowStates(args.rows, collapsedNestedRowIds, args.levelColumnIndex, args.indentColumnIndex), [args.indentColumnIndex, args.levelColumnIndex, args.rows, collapsedNestedRowIds])
  const visibleNestedRowStates = React.useMemo(() => states.filter(state => !state.hidden), [states])
  const parents = React.useMemo(() => states.filter(state => state.childCount > 0).map(state => state.row.id), [states])
  const areAllNestedRowsCollapsed = parents.length > 0 && parents.every(id => collapsedNestedRowIds.has(id))
  const toggleNestedRow = React.useCallback((id: string) => setCollapsedNestedRowIds(previous => {
    const next = new Set(previous)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  }), [])
  const toggleAllNestedRows = React.useCallback(() => setCollapsedNestedRowIds(previous => {
    const next = new Set(previous)
    for (const id of parents) { if (areAllNestedRowsCollapsed) next.delete(id); else next.add(id) }
    return next
  }), [areAllNestedRowsCollapsed, parents])
  return { areAllNestedRowsCollapsed, collapsedNestedRowIds, hasNestedRowHierarchy: states.some(state => state.depth > 0 || state.childCount > 0), toggleAllNestedRows, toggleNestedRow, visibleNestedRowStates }
}

const baseHost: TableHostAdapter = {
  contract: 'agentic-base/table-host/v1',
  themeTokens: {
    table: {
      headerBg: 'bg-[var(--agentic-base-table-header-bg)]',
      text: 'text-[color:var(--agentic-base-text-primary)]',
      cellBorder: 'border-[color:var(--agentic-base-border)]',
      rowHoverHighlight: 'hover:bg-[var(--agentic-base-row-hover)]',
      rowSelected: 'agentic-base-data-row-selected',
    },
    text: {
      primary: 'text-[color:var(--agentic-base-text-primary)]',
      secondary: 'text-[color:var(--agentic-base-text-secondary)]',
      tertiary: 'text-[color:var(--agentic-base-text-tertiary)]',
    },
    button: { hoverBg: 'hover:bg-[var(--agentic-base-action-hover)]' },
    panel: { border: 'border-[color:var(--agentic-base-border)]' },
    icon: { color: 'text-[color:var(--agentic-base-text-secondary)]' },
  },
  copy: { newRecordLabel: 'New record' },
  styles: {
    actionRowClass: 'agentic-base-action-row', compactGlyphClass: 'agentic-base-compact-glyph', dataViewMenuPanelClass: 'agentic-base-menu-panel',
    dataViewTableFrameClass: 'agentic-base-data-view', dataViewTableProgressClass: 'agentic-base-progress',
    dataViewTableValueClass: 'agentic-base-data-table-value', elementRowClass: 'flex min-w-0 items-center', inlineElementRowClass: 'inline-flex min-w-0 items-center',
    menuIconActionClass: 'agentic-base-menu-icon-action', textTruncateClass: 'truncate', toolbarRowScrollClass: 'flex min-w-0 overflow-x-auto', stickyHeaderClass: 'agentic-base-data-table-sticky-header',
  },
  icons: { iconByColumnType },
  components: {
    TagChip: BaseTagChip, ColumnTypeMenu: BaseColumnTypeMenu, AddColumnMenu: BaseAddColumnMenu,
    ColumnHeaderPropertyTypeMenu: BaseColumnHeaderPropertyTypeMenu, ColumnHeaderMenu: BaseColumnHeaderMenu,
    HierarchyCell: BaseHierarchyCell, InlineTextCellEditor: BaseInlineTextCellEditor,
    NestedRowsBulkToggle: BaseNestedRowsBulkToggle, ColumnResizeHandle: BaseColumnResizeHandle,
    CellSelectPopover: BaseCellSelectPopover,
  },
  stores: { tablePreferences: { subscribe: () => () => {}, getSnapshot: () => neutralStoreSnapshot, getServerSnapshot: () => neutralStoreSnapshot } },
  data: {
    splitMultiValues: (value: string) => String(value ?? '').split(/[\n,]/u).map(item => item.trim()).filter(Boolean),
    readDisplayText: (value: string) => String(value ?? ''), renderInlineText: (value: string) => String(value ?? ''),
    buildMediaCommandContext: () => '', buildNestedCellMap: () => new Map(), renderRichCell: () => null,
    useNestedRowCollapse: useBaseNestedRowCollapse,
  },
  helpers: {
    defaultColumnWidthPx: 192,
    readDefaultColumnWidth: (name: string) => {
      const normalized = String(name ?? '').trim()
      if (normalized === 'Line' || normalized === 'Indent') return 72
      if (normalized === 'Type') return 112
      if (normalized === 'Content') return 260
      if (normalized === 'Key') return 220
      if (['Summary', 'Output', 'Action', 'Reference Pack'].includes(normalized)) return 220
      if (/Value$/u.test(normalized)) return 184
      return 192
    },
    cellPreviewCharLimit: 96,
    readCellDisplayText: (value: string, mode: string) => mode === 'flex' || value.length <= 96 ? value : `${value.slice(0, 95).trimEnd()}...`,
    readCellPreviewText: (value: string) => value.length > 96 ? `${value.slice(0, 96).trimEnd()}...` : value,
    coerceFieldLineMode: (value: unknown) => value === 'double' || value === 'flex' ? value : 'single',
    coerceRowHeightPreset: (value: unknown) => value === 'compact' ? 'compact' : 'comfortable',
    readFieldLineClassName: (mode: string) => mode === 'double' ? 'overflow-hidden whitespace-pre-wrap break-words line-clamp-2' : mode === 'flex' ? 'whitespace-pre-wrap break-words' : 'block truncate',
    readHeaderPaddingClassName: (preset: string) => readBaseDataViewHeaderPaddingClassName(preset === 'compact' ? 'compact' : 'comfortable'),
    readTablePaddingClassName: (preset: string) => readBaseDataViewCellPaddingClassName(preset === 'compact' ? 'compact' : 'comfortable'),
  },
}

/** Product-neutral read-only capable host for the shared Table and Multi-dimensional Table. */
export function createBaseTableHost(overrides: Partial<TableHostAdapter> = {}): TableHostAdapter {
  const themeTokens: Record<string, unknown> = { ...baseHost.themeTokens }
  for (const [section, value] of Object.entries(overrides.themeTokens ?? {})) {
    const baseValue = themeTokens[section]
    themeTokens[section] = baseValue && value && typeof baseValue === 'object' && typeof value === 'object'
      ? { ...(baseValue as Record<string, unknown>), ...(value as Record<string, unknown>) }
      : value
  }
  return {
    ...baseHost, ...overrides,
    themeTokens,
    copy: { ...baseHost.copy, ...overrides.copy },
    styles: { ...baseHost.styles, ...overrides.styles },
    icons: { ...baseHost.icons, ...overrides.icons },
    components: { ...baseHost.components, ...overrides.components },
    stores: { ...baseHost.stores, ...overrides.stores },
    data: { ...baseHost.data, ...overrides.data },
    helpers: { ...baseHost.helpers, ...overrides.helpers },
  }
}
