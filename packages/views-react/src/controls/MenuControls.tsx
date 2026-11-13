import React from 'react'
import { createPortal } from 'react-dom'
import { bindDropdownPopup, bindMenuKeyboard, MENU_CLASS_NAME, menuOptionClassName, MENU_INDICATOR_PATHS, menuIndicatorStyle, SHARED_ICON_NODES, SHARED_ICON_VIEW_BOX, type SharedIconName, type MenuIndicatorKind } from './dropdownMenu.js'

function MenuIndicator({ kind, label }: { kind: MenuIndicatorKind; label: string }) {
  return <svg className="agentic-icon agentic-menu-mark" style={menuIndicatorStyle(kind)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={label}>
    <path d={MENU_INDICATOR_PATHS[kind]} />
  </svg>
}

export type DesignIconProps = Omit<React.SVGProps<SVGSVGElement>, 'name' | 'children'> & { name: SharedIconName; label?: string }
export function DesignIcon({ name, label, className = '', ...props }: DesignIconProps) {
  const nodes = SHARED_ICON_NODES[name]
  if (!nodes) throw new Error(`Unknown shared icon: ${name}`)
  const decorative = props['aria-hidden'] === true || props['aria-hidden'] === 'true'
  const iconClassName = [...new Set(['agentic-icon', ...className.split(/\s+/).filter(Boolean)])].join(' ')
  return <svg viewBox={SHARED_ICON_VIEW_BOX} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}
    className={iconClassName} aria-hidden={decorative ? true : props['aria-hidden']}
    role={decorative ? undefined : props.role || 'img'} aria-label={decorative ? undefined : props['aria-label'] || label || name}>
    {nodes.map(([tag, attributes], index) => React.createElement(tag as string, { ...attributes as object, key: index }))}
  </svg>
}
export const DESIGN_ICONS = Object.fromEntries(Object.keys(SHARED_ICON_NODES).map(name => [name,
  (props: Omit<DesignIconProps, 'name'>) => <DesignIcon {...props} name={name as SharedIconName} />,
])) as Record<SharedIconName, React.ComponentType<Omit<DesignIconProps, 'name'>>>
export type KeyTypeValueRowProps = {
  keyNode: React.ReactNode; typeNode?: React.ReactNode; valueNode: React.ReactNode
  align?: 'center' | 'start'; className?: string; keyClassName?: string; typeClassName?: string; valueClassName?: string
  id?: string; dataKgAnchor?: string; onClick?: () => void
}
/** One semantic KTV structure. Layout and typography come from the central CSS projection. */
export function KeyTypeValueRow({ keyNode, typeNode, valueNode, align = 'center', className = '', keyClassName = '', typeClassName = '', valueClassName = '', id, dataKgAnchor, onClick }: KeyTypeValueRowProps) {
  return <section className="agentic-ktv-container"><dl id={id} data-panel-field-row="true" data-kg-anchor={dataKgAnchor} data-align={align}
    className={`agentic-ktv-row ${className}`} onClick={onClick}>
    <dt className={`agentic-ktv-key ${keyClassName}`}>{keyNode}</dt>
    <dd className={`agentic-ktv-type ${typeClassName}`}>{typeNode ?? <DesignIcon name="Type" label="Text" />}</dd>
    <dd className={`agentic-ktv-value ${valueClassName}`}>{valueNode}</dd>
  </dl></section>
}

export type SemanticSelectOption = { value: string; label: string; disabled: boolean; group?: string }
function textContent(node: React.ReactNode): string {
  return React.Children.toArray(node).map(child => React.isValidElement<{ children?: React.ReactNode }>(child)
    ? textContent(child.props.children) : String(child)).join('')
}
export function readSemanticSelectOptions(children: React.ReactNode, group?: string, disabled = false): SemanticSelectOption[] {
  return React.Children.toArray(children).flatMap(child => {
    if (!React.isValidElement<React.OptionHTMLAttributes<HTMLOptionElement>>(child)) return []
    const props = child.props
    if (child.type === React.Fragment) return readSemanticSelectOptions(props.children, group, disabled)
    if (child.type === 'optgroup') return readSemanticSelectOptions(props.children, props.label, disabled || !!props.disabled)
    if (child.type !== 'option') throw new Error('SemanticSelect accepts option, optgroup, and Fragment children only')
    if (props.hidden) return []
    const label = props.label ?? textContent(props.children)
    return [{ value: String(props.value ?? label), label, disabled: disabled || !!props.disabled, group }]
  })
}

export type DropdownMenuSurfaceProps = React.HTMLAttributes<HTMLMenuElement> & { onDismiss?: (restoreFocus: boolean) => void }
export const DropdownMenuSurface = React.forwardRef<HTMLElement, DropdownMenuSurfaceProps>(function DropdownMenuSurface({ className = '', onDismiss, ...props }, ref) {
  const local = React.useRef<HTMLElement | null>(null)
  React.useLayoutEffect(() => local.current ? bindMenuKeyboard(local.current, onDismiss) : undefined, [onDismiss])
  return <menu {...props} role={props.role || 'menu'} ref={element => {
    local.current = element
    if (typeof ref === 'function') ref(element)
    else if (ref) ref.current = element
  }} className={`${MENU_CLASS_NAME} ${className}`} />
})

export type SemanticSelectProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'defaultValue' | 'onChange' | 'type'> & {
  value?: string | number
  defaultValue?: string | number
  onValueChange?: (value: string) => void
  required?: boolean
  menuTextClassName?: string
}

/** React value adapter; popup lifecycle, keyboard and appearance are shared with native forms. */
export const SemanticSelect = React.forwardRef<HTMLButtonElement, SemanticSelectProps>(function SemanticSelect({
  children, value, defaultValue, onValueChange, disabled, required, name, form, className = '', style,
  onClick, onKeyDown, menuTextClassName = '', ...props
}, forwardedRef) {
  const options = React.useMemo(() => readSemanticSelectOptions(children), [children])
  const [localValue, setLocalValue] = React.useState(() => String(defaultValue ?? options.find(option => !option.disabled)?.value ?? ''))
  const selectedValue = String(value ?? localValue), selected = options.find(option => option.value === selectedValue)
  const [open, setOpen] = React.useState(false), [invalid, setInvalid] = React.useState(false), [fieldLabel, setFieldLabel] = React.useState('')
  const triggerRef = React.useRef<HTMLButtonElement | null>(null), menuRef = React.useRef<HTMLElement | null>(null)
  const [id] = React.useState(() => `agentic-menu-${crypto.randomUUID()}`)
  const menuId = `${id}-menu`, errorId = `${id}-error`
  const label = props['aria-label'] || fieldLabel || props.title || selected?.label || 'Choose value'
  const close = React.useCallback((restoreFocus = false) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true })
  }, [])
  const show = () => { if (!disabled && options.some(option => !option.disabled)) setOpen(true) }
  React.useLayoutEffect(() => {
    const button = triggerRef.current, field = button?.labels?.[0] || button?.closest('dd')?.parentElement?.querySelector('dt')
    if (!field) return
    const copy = field.cloneNode(true) as Element
    copy.querySelectorAll('button,input,select,menu,svg').forEach(element => element.remove())
    setFieldLabel(copy.textContent?.trim() || '')
  }, [children])
  React.useLayoutEffect(() => {
    if (open && triggerRef.current && menuRef.current) return bindDropdownPopup(triggerRef.current, menuRef.current, close)
  }, [open, close, options, selectedValue])
  React.useEffect(() => { if (disabled) close() }, [close, disabled])
  React.useEffect(() => {
    const owner = triggerRef.current?.form
    if (!owner) return
    const reset = () => { setLocalValue(String(defaultValue ?? options.find(option => !option.disabled)?.value ?? '')); setInvalid(false); close() }
    owner.addEventListener('reset', reset)
    return () => owner.removeEventListener('reset', reset)
  }, [close, defaultValue, options])
  return <>
    <button {...props} type="button" form={form} ref={element => {
      triggerRef.current = element
      if (typeof forwardedRef === 'function') forwardedRef(element)
      else if (forwardedRef) forwardedRef.current = element
    }} disabled={disabled} value={selectedValue} className={`agentic-form-control agentic-select-trigger ${className}`} style={style}
      aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
      aria-invalid={invalid || undefined} aria-describedby={invalid ? errorId : props['aria-describedby']}
      data-agentic-select="true" data-value={selectedValue}
      onClick={event => { onClick?.(event); if (!event.defaultPrevented) { if (open) close(); else show() } }}
      onKeyDown={event => {
        onKeyDown?.(event)
        if (event.defaultPrevented) return
        if (event.key === 'Enter' || event.key === ' ') event.stopPropagation()
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); show() }
      }}>
      <span className="agentic-menu-label">{selected?.label || selectedValue || 'Choose…'}</span>
      <MenuIndicator kind="chevron" label="Show choices" />
    </button>
    {name || required ? <input type={required ? 'text' : 'hidden'} name={name} form={form}
      className={required ? 'sr-only' : undefined} tabIndex={-1} required={required} disabled={disabled}
      aria-label={`${label} form value`} value={selectedValue} onChange={() => {}}
      onInvalid={event => { event.preventDefault(); setInvalid(true); triggerRef.current?.focus() }} /> : null}
    {invalid && !selectedValue ? <span id={errorId} role="alert">Choose a value.</span> : null}
    {open && typeof document !== 'undefined' ? createPortal(
      <menu ref={menuRef} role="menu" id={menuId} aria-label={label} className={`${MENU_CLASS_NAME} agentic-menu-popup ${menuTextClassName}`}>
        {options.map((option, index) => <React.Fragment key={`${option.group || ''}:${option.value}:${index}`}>
          {option.group && option.group !== options[index - 1]?.group ? <li role="separator" aria-label={option.group}>{option.group}</li> : null}
          <li role="none">
            <button type="button" role="menuitemradio" aria-checked={option.value === selectedValue}
              aria-label={option.label} value={option.value} disabled={option.disabled} tabIndex={-1}
              className={menuOptionClassName(option.value === selectedValue)} onClick={event => {
                if (event.defaultPrevented || option.disabled) return
                setLocalValue(option.value); setInvalid(false); close(true)
                if (option.value !== selectedValue) onValueChange?.(option.value)
              }}>
              <span className="agentic-menu-label">{option.label}</span>
              {option.value === selectedValue ? <MenuIndicator kind="check" label="Selected" /> : null}
            </button>
          </li>
        </React.Fragment>)}
      </menu>, triggerRef.current?.closest('dialog') || document.body) : null}
  </>
})
