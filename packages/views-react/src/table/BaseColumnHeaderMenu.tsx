import React from 'react'
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BarChart3, Calendar, Check,
  CheckSquare, ChevronDown, ChevronRight, Clock, Columns2, Copy, EyeOff,
  Filter, Hash, Link2, ListChecks, MapPin, Paperclip, Trash2, Type, User, Users, X,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { VIEW_COLUMN_TYPE_OPTIONS } from './ViewColumnType'

type AnyProps = Record<string, any>

const typeIconByKey: Record<string, ComponentType<any>> = {
  checkbox: CheckSquare,
  date: Calendar,
  'multi-select': ListChecks,
  number: Hash,
  progress: BarChart3,
  select: ChevronDown,
  link: Link2,
  geodata: MapPin,
  text: Type,
  'created-time': Clock,
  attachment: Paperclip,
  member: Users,
  'created-by': User,
}

function MenuIcon({ icon: Icon, label, target }: { icon: ComponentType<any>; label: string; target: string }) {
  return <Icon size={16} strokeWidth={1.7} role="img" aria-label={label} data-kg-selection-target={target} />
}

function MenuAction(props: {
  label: string
  icon: ComponentType<any>
  target: string
  disabled?: boolean
  onSelect?: () => void
}) {
  const { label, icon, target, disabled = false, onSelect } = props
  return <li>
    <button type="button" role="menuitem" aria-label={label} aria-disabled={disabled} disabled={disabled}
      data-kg-selection-target={target} className="agentic-base-column-menu-row"
      onClick={() => { if (!disabled) onSelect?.() }}>
      <MenuIcon icon={icon} label={label} target={`${target}-icon`} />
      <span data-kg-selection-target={`${target}-label`}>{label}</span>
    </button>
  </li>
}

export function BaseColumnTypeMenu(props: AnyProps) {
  const current = VIEW_COLUMN_TYPE_OPTIONS.find(option => option.key === props.value)
  const currentLabel = props.currentLabel ?? current?.label ?? 'Text'
  const isDisabled = Boolean(props.disabled)
  return <details className="agentic-base-column-menu-disclosure agentic-base-column-type-disclosure" data-kg-selection-target="column-type-disclosure">
    <summary aria-label={`Type: ${currentLabel}`} aria-haspopup="menu" data-kg-selection-target="column-type-disclosure-trigger"
      className="agentic-base-column-menu-row agentic-base-column-menu-summary">
      <MenuIcon icon={Columns2} label="Column type" target="column-type-menu-icon" />
      <span data-kg-selection-target="column-type-menu-label">Type</span>
      <span className="agentic-base-column-menu-value" data-kg-selection-target="column-type-current-value">{currentLabel}</span>
      <ChevronDown className="agentic-base-column-menu-chevron" size={14} strokeWidth={1.7} role="img" aria-label="Expand choices" data-kg-selection-target="column-type-expand" />
    </summary>
    <menu role="menu" aria-label={props.ariaLabel ?? `Column type: ${currentLabel}`} className="agentic-base-column-type-options">
      {VIEW_COLUMN_TYPE_OPTIONS.map(option => {
        const Icon = typeIconByKey[option.key] ?? Columns2
        const selected = option.key === props.value
        return <li key={option.key}>
          <button type="button" role="menuitemradio" aria-checked={selected} aria-label={option.label}
            aria-disabled={isDisabled} disabled={isDisabled} data-kg-selection-target={`column-type-option-${option.key}`}
            className="agentic-base-column-menu-row agentic-base-column-type-option"
            onClick={() => { if (isDisabled) return; props.onSelect?.(option.key); props.close?.() }}>
            <MenuIcon icon={Icon} label={`${option.label} type`} target={`column-type-option-icon-${option.key}`} />
            <span data-kg-selection-target={`column-type-option-label-${option.key}`}>{option.label}</span>
            {selected ? <MenuIcon icon={Check} label="Selected" target="column-type-option-selected" /> : null}
          </button>
        </li>
      })}
    </menu>
  </details>
}

function FilterEditor({ filter, closeMenu, onCancel }: { filter: AnyProps; closeMenu?: () => void; onCancel: () => void }) {
  const [filterValue, setFilterValue] = React.useState('')
  const [filterOp, setFilterOp] = React.useState(filter.defaultOp ?? filter.ops?.[0]?.key ?? 'contains')
  const cancel = () => { setFilterValue(''); onCancel() }
  const apply = () => {
    filter.onApply({ op: filterOp, value: filterValue })
    closeMenu?.()
  }
  return <section role="group" aria-label="Filter editor" data-kg-selection-target="column-filter-editor" className="agentic-base-column-filter-editor">
    <header className="agentic-base-column-filter-header">
      <strong data-kg-selection-target="column-filter-title">Filter</strong>
      <span className="agentic-base-column-filter-spacer" />
      <button type="button" aria-label="Cancel filter" title="Cancel filter" data-kg-selection-target="column-filter-cancel"
        className="agentic-base-column-icon-action" onClick={cancel}>
        <MenuIcon icon={X} label="Cancel filter" target="column-filter-cancel-icon" />
      </button>
      <button type="button" aria-label="Apply filter" title="Apply filter" data-kg-selection-target="column-filter-apply"
        className="agentic-base-column-icon-action" onClick={apply}>
        <MenuIcon icon={Check} label="Apply filter" target="column-filter-apply-icon" />
      </button>
    </header>
    <fieldset className="agentic-base-column-filter-fields">
      <label className="agentic-base-column-filter-field">
        <span>Op</span>
        <select aria-label="Filter operation" data-kg-selection-target="column-filter-operation" value={filterOp}
          onChange={event => setFilterOp(event.target.value)}>
          {filter.ops.map((op: AnyProps) => <option key={op.key} value={op.key}>{op.label}</option>)}
        </select>
      </label>
      <label className="agentic-base-column-filter-field">
        <span>Value</span>
        <input aria-label="Filter value" data-kg-selection-target="column-filter-value" value={filterValue}
          onChange={event => setFilterValue(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') apply() }} />
      </label>
    </fieldset>
  </section>
}

function FilterMenuItem(props: AnyProps) {
  const disclosureRef = React.useRef<HTMLDetailsElement>(null)
  return <li>
    <details ref={disclosureRef} className="agentic-base-column-menu-disclosure agentic-base-column-filter-disclosure" data-kg-selection-target="column-filter-disclosure">
      <summary aria-label="Filter" data-kg-selection-target="column-filter-trigger"
        aria-disabled={!props.filter} className="agentic-base-column-menu-row agentic-base-column-menu-summary" onClick={event => { if (!props.filter) event.preventDefault() }}>
        <MenuIcon icon={Filter} label="Filter" target="column-filter-icon" />
        <span data-kg-selection-target="column-filter-label">Filter</span>
        <ChevronRight size={14} strokeWidth={1.7} role="img" aria-label="Open filter editor" data-kg-selection-target="column-filter-chevron" />
      </summary>
      {props.filter ? <FilterEditor filter={props.filter} closeMenu={props.closeMenu} onCancel={() => disclosureRef.current?.removeAttribute('open')} /> : null}
    </details>
  </li>
}

export function BaseColumnHeaderMenu(props: AnyProps) {
  const action = (callback: (() => void) | undefined) => () => { callback?.(); props.closeMenu?.() }
  const disabled = (name: string, callback?: (() => void)) => Boolean(props[`disable${name}`] || !callback)
  return <menu role="menu" aria-label={props.ariaLabel} data-kg-selection-target="column-header-menu-content" className="agentic-base-column-menu-list">
    <li>
      {props.renderTypeMenu?.() ?? <BaseColumnTypeMenu ariaLabel={props.ariaLabel} value={props.typeValue} disabled={props.disableTypeChange} close={props.closeMenu} />}
    </li>
    <li className="agentic-base-column-menu-separator" role="separator"><hr aria-label="Type actions" /></li>
    <MenuAction label="Hide In View" icon={EyeOff} target="column-hide-in-view"
      disabled={!props.onHideInView} onSelect={action(props.onHideInView)} />
    <FilterMenuItem filter={props.filter} closeMenu={props.closeMenu} />
    <MenuAction label="Sort Ascending" icon={ArrowUp} target="column-sort-ascending"
      disabled={disabled('Sort', props.onSortAsc)} onSelect={action(props.onSortAsc)} />
    <MenuAction label="Sort Descending" icon={ArrowDown} target="column-sort-descending"
      disabled={disabled('Sort', props.onSortDesc)} onSelect={action(props.onSortDesc)} />
    <li className="agentic-base-column-menu-separator" role="separator"><hr aria-label="Column movement actions" /></li>
    <MenuAction label="Insert Left Column" icon={ArrowLeft} target="column-insert-left"
      disabled={disabled('Insert', props.onInsertLeft)} onSelect={action(props.onInsertLeft)} />
    <MenuAction label="Insert Right Column" icon={ArrowRight} target="column-insert-right"
      disabled={disabled('Insert', props.onInsertRight)} onSelect={action(props.onInsertRight)} />
    <MenuAction label="Move Left" icon={ArrowLeft} target="column-move-left"
      disabled={disabled('MoveLeft', props.onMoveLeft)} onSelect={action(props.onMoveLeft)} />
    <MenuAction label="Move Right" icon={ArrowRight} target="column-move-right"
      disabled={disabled('MoveRight', props.onMoveRight)} onSelect={action(props.onMoveRight)} />
    <li className="agentic-base-column-menu-separator" role="separator"><hr aria-label="Column management actions" /></li>
    <MenuAction label="Duplicate" icon={Copy} target="column-duplicate"
      disabled={disabled('Duplicate', props.onDuplicate)} onSelect={action(props.onDuplicate)} />
    <MenuAction label="Delete" icon={Trash2} target="column-delete"
      disabled={disabled('Delete', props.onDelete)} onSelect={action(props.onDelete)} />
  </menu>
}

