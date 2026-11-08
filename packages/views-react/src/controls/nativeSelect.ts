import { bindDropdownPopup, MENU_CLASS_NAME, menuOptionClassName, createMenuIndicator } from './dropdownMenu.js'

export type NativeSelectHandle = { refresh(): void; destroy(): void }
const mounted = new WeakMap<HTMLSelectElement, NativeSelectHandle>()
const enhancedRoots = new WeakMap<Document | HTMLElement, NativeSelectHandle>()

/** A native form value remains authoritative; only its visible popup is replaced. */
export function enhanceSelect(select: HTMLSelectElement): NativeSelectHandle {
  const prior = mounted.get(select)
  if (prior) return prior
  if (select.multiple || select.size > 1) throw new Error('Shared dropdown enhancement requires a single-choice select, not a listbox')
  const button = document.createElement('button'), label = document.createElement('span'), chevron = createMenuIndicator('chevron', 'Show choices')
  const id = `agentic-select-${crypto.randomUUID()}`
  const wasHidden = select.hidden, tabIndex = select.tabIndex, hadFocus = document.activeElement === select
  const ariaLabel = select.getAttribute('aria-label'), ariaLabelledBy = select.getAttribute('aria-labelledby'), ariaHidden = select.getAttribute('aria-hidden')
  const labels = [...(select.labels || [])], labelTargets = labels.map(item => item.htmlFor)
  let menu: HTMLMenuElement | null = null, release: (() => void) | undefined
  button.type = 'button'; button.id = `${id}-trigger`
  button.className = `${select.className} agentic-form-control agentic-select-trigger`
  button.dataset.agenticSelectFor = select.id
  button.setAttribute('aria-haspopup', 'menu'); button.setAttribute('aria-expanded', 'false')
  label.className = 'agentic-menu-label'; button.append(label, chevron)
  const nativeFocus = select.focus, proxyFocus = button.focus.bind(button)
  select.focus = proxyFocus
  select.after(button); select.classList.add('agentic-select-source'); select.tabIndex = -1
  select.setAttribute('aria-hidden', 'true'); select.removeAttribute('aria-label'); select.removeAttribute('aria-labelledby')
  labels.forEach(item => { item.htmlFor = button.id })
  const fieldLabel = () => ariaLabel || labels.map(item => {
    const copy = item.cloneNode(true) as Element
    copy.querySelectorAll('select, button, input, textarea, menu, svg').forEach(child => child.remove())
    return copy.textContent
  }).join(' ').trim() || select.title || 'Choose value'
  const close = (restoreFocus = false) => {
    release?.(); release = undefined; menu?.remove(); menu = null
    button.setAttribute('aria-expanded', 'false'); button.removeAttribute('aria-controls')
    if (restoreFocus && button.isConnected) button.focus({ preventScroll: true })
  }
  const refresh = () => {
    const text = select.selectedOptions[0]?.label || 'Choose…'
    if (label.textContent !== text) label.textContent = text
    if (button.disabled !== select.disabled) button.disabled = select.disabled
    const hidden = select.hidden || Boolean(select.closest('[hidden]'))
    if (button.hidden !== hidden) button.hidden = hidden
    button.setAttribute('aria-label', fieldLabel()); button.dataset.value = select.value
    if (select.getAttribute('aria-describedby')) button.setAttribute('aria-describedby', select.getAttribute('aria-describedby')!)
    if (select.getAttribute('aria-invalid')) button.setAttribute('aria-invalid', select.getAttribute('aria-invalid')!)
    if (menu && (button.matches(':disabled') || button.hidden)) close()
  }
  const open = () => {
    refresh()
    if (button.matches(':disabled') || button.hidden) return
    if (menu) { close(); return }
    menu = document.createElement('menu'); menu.id = `${id}-menu`; menu.className = `${MENU_CLASS_NAME} agentic-menu-popup`
    menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', fieldLabel())
    let group: string | null = null
    for (const option of select.options) {
      if (option.hidden) continue
      const parent = option.parentElement, groupName = parent?.tagName === 'OPTGROUP' ? (parent as HTMLOptGroupElement).label : null
      if (groupName && groupName !== group) {
        const heading = document.createElement('li'); heading.setAttribute('role', 'separator'); heading.setAttribute('aria-label', groupName); heading.textContent = groupName; menu.append(heading)
      }
      group = groupName
      const row = document.createElement('li'), item = document.createElement('button'), text = document.createElement('span')
      row.setAttribute('role', 'none'); item.type = 'button'; item.tabIndex = -1; item.value = option.value
      item.className = menuOptionClassName(option.selected); item.setAttribute('role', 'menuitemradio')
      item.setAttribute('aria-label', option.label); item.setAttribute('aria-checked', String(option.selected))
      item.disabled = option.disabled || parent?.tagName === 'OPTGROUP' && (parent as HTMLOptGroupElement).disabled
      text.className = 'agentic-menu-label'; text.textContent = option.label
      item.append(text)
      if (option.selected) item.append(createMenuIndicator('check', 'Selected'))
      row.append(item); menu.append(row)
      item.addEventListener('click', event => {
        if (event.defaultPrevented || item.disabled) return
        const changed = select.value !== option.value
        select.value = option.value; close(true); refresh(); button.removeAttribute('aria-invalid')
        if (changed) { select.dispatchEvent(new Event('input', { bubbles: true })); select.dispatchEvent(new Event('change', { bubbles: true })) }
      })
    }
    (select.closest('dialog, [popover]') || document.body).append(menu); button.setAttribute('aria-expanded', 'true'); button.setAttribute('aria-controls', menu.id)
    release = bindDropdownPopup(button, menu, close)
  }
  const keys = (event: KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { event.preventDefault(); open() }
  }
  const invalid = (event: Event) => { event.preventDefault(); button.setAttribute('aria-invalid', 'true'); button.focus() }
  const focus = () => button.focus()
  const reset = () => queueMicrotask(() => { close(); refresh(); button.removeAttribute('aria-invalid') })
  button.addEventListener('click', open); button.addEventListener('keydown', keys)
  select.addEventListener('change', refresh); select.addEventListener('invalid', invalid); select.addEventListener('focus', focus)
  select.form?.addEventListener('reset', reset)
  const handle = { refresh, destroy() {
    close(); if (select.focus === proxyFocus) select.focus = nativeFocus; button.remove(); select.classList.remove('agentic-select-source'); select.hidden = wasHidden; select.tabIndex = tabIndex
    for (const [key, prior] of [['aria-label', ariaLabel], ['aria-labelledby', ariaLabelledBy], ['aria-hidden', ariaHidden]]) {
      if (prior === null) select.removeAttribute(key!); else select.setAttribute(key!, prior!)
    }
    labels.forEach((item, index) => { if (item.htmlFor === button.id) item.htmlFor = labelTargets[index] })
    select.removeEventListener('change', refresh); select.removeEventListener('invalid', invalid); select.removeEventListener('focus', focus)
    select.form?.removeEventListener('reset', reset); mounted.delete(select)
  } }
  mounted.set(select, handle); refresh(); if (hadFocus && !button.disabled && !button.hidden) button.focus({ preventScroll: true }); return handle
}

/** Observe dynamic form projections; owners can explicitly refresh property-only updates. */
export function enhanceSelects(root: Document | HTMLElement = document): NativeSelectHandle {
  const existing = enhancedRoots.get(root)
  if (existing) return existing
  const handles = new Map<HTMLSelectElement, NativeSelectHandle>()
  let queued = false, stopped = false
  const refresh = () => {
    queued = false
    if (stopped) return
    for (const select of root.querySelectorAll<HTMLSelectElement>('select:not([multiple])')) {
      if (select.size > 1) continue
      if (!handles.has(select)) handles.set(select, enhanceSelect(select))
      handles.get(select)!.refresh()
    }
    for (const [select, handle] of handles) if (!root.contains(select)) { handle.destroy(); handles.delete(select) }
  }
  const schedule = () => { if (!queued) { queued = true; queueMicrotask(refresh) } }
  const observer = new MutationObserver(schedule)
  observer.observe(root.nodeType === 9 ? (root as Document).documentElement : root, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'selected', 'label', 'value', 'hidden'] })
  root.addEventListener('change', schedule, true); refresh()
  const handle = { refresh, destroy() { enhancedRoots.delete(root); stopped = true; observer.disconnect(); root.removeEventListener('change', schedule, true); for (const handle of handles.values()) handle.destroy(); handles.clear() } }
  enhancedRoots.set(root, handle); return handle
}
