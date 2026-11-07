export const DROPDOWN_OPEN_EVENT = 'agentic:dropdown-open'
export const MENU_CLASS_NAME = 'agentic-menu'
export const MENU_OPTION_CLASS_NAME = 'agentic-form-control agentic-menu-option'
export type DropdownOpenDetail = { sourceId: string }

export const MENU_INDICATOR_PATHS = { chevron: 'm6 9 6 6 6-6', check: 'M20 6 9 17l-5-5' } as const
export type MenuIndicatorKind = keyof typeof MENU_INDICATOR_PATHS
export function menuIndicatorStyle(kind: MenuIndicatorKind) {
  const size = `var(--agentic-icon-size-${kind === 'chevron' ? 'compact' : 'default'})`
  return { inlineSize: size, blockSize: size, display: 'block', flex: '0 0 auto' }
}
export function createMenuIndicator(kind: MenuIndicatorKind, label: string): SVGSVGElement {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })) icon.setAttribute(key, value)
  icon.classList.add('agentic-menu-mark'); Object.assign(icon.style, menuIndicatorStyle(kind))
  icon.setAttribute('role', 'img'); icon.setAttribute('aria-label', label)
  const path = document.createElementNS(icon.namespaceURI, 'path'); path.setAttribute('d', MENU_INDICATOR_PATHS[kind]); icon.append(path)
  return icon
}

export function menuOptionClassName(selected: boolean): string {
  return `${MENU_OPTION_CLASS_NAME}${selected ? ' agentic-menu-selected' : ''}`
}

export function readDropdownOpenEventDetail(event: Event | null | undefined): DropdownOpenDetail | null {
  const detail = (event as CustomEvent<unknown> | undefined)?.detail
  if (!detail || typeof detail !== 'object' || Array.isArray(detail)) return null
  const sourceId = String((detail as DropdownOpenDetail).sourceId || '').trim()
  return sourceId ? { sourceId } : null
}

export function emitDropdownOpen(sourceId: string): void {
  if (typeof window === 'undefined' || !sourceId.trim()) return
  window.dispatchEvent(new window.CustomEvent(DROPDOWN_OPEN_EVENT, { detail: { sourceId } }))
}

export function subscribeDropdownOpen(listener: (detail: DropdownOpenDetail) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handle = (event: Event) => { const detail = readDropdownOpenEventDetail(event); if (detail) listener(detail) }
  window.addEventListener(DROPDOWN_OPEN_EVENT, handle)
  return () => window.removeEventListener(DROPDOWN_OPEN_EVENT, handle)
}

export function menuEntries(menu: HTMLElement): HTMLElement[] {
  return [...menu.querySelectorAll<HTMLElement>('.agentic-menu-option, [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]')]
    .filter(element => {
      if (element.matches(':disabled, [aria-disabled="true"], [hidden]') || element.closest('[hidden]')) return false
      for (let parent: Element | null = element; parent && parent !== menu; parent = parent.parentElement) {
        if (parent.tagName === 'DETAILS' && !(parent as HTMLDetailsElement).open && !parent.querySelector(':scope > summary')?.contains(element)) return false
        if (window.getComputedStyle(parent).display === 'none' || window.getComputedStyle(parent).visibility === 'hidden') return false
      }
      return true
    })
}

export function focusMenuEntry(element?: HTMLElement): void {
  element?.focus({ preventScroll: true })
  element?.scrollIntoView?.({ block: 'nearest' })
}

/** Shared roving focus/typeahead for action, single-choice and nested menus. */
export function bindMenuKeyboard(menu: HTMLElement, dismiss?: (restoreFocus: boolean) => void): () => void {
  let search = '', searchedAt = 0
  const keydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || (event.target as HTMLElement).matches('input, textarea, [contenteditable="true"]')) return
    if (event.key === 'Escape') { if (dismiss) { event.preventDefault(); event.stopPropagation(); dismiss(true) }; return }
    if (event.key === 'Tab') { dismiss?.(true); return }
    const entries = menuEntries(menu), current = entries.indexOf(document.activeElement as HTMLElement)
    if (!entries.length) return
    let next: number | undefined
    if (event.key === 'ArrowDown') next = (current + 1) % entries.length
    if (event.key === 'ArrowUp') next = (current - 1 + entries.length) % entries.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = entries.length - 1
    if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now()
      search = now - searchedAt > 700 ? event.key.toLowerCase() : search + event.key.toLowerCase()
      searchedAt = now
      const query = [...search].every(char => char === search[0]) ? search[0] : search
      const ordered = [...entries.slice(current + 1), ...entries.slice(0, current + 1)]
      const found = ordered.find(entry => (entry.getAttribute('aria-label') || entry.textContent || '').trim().toLowerCase().startsWith(query))
      if (found) next = entries.indexOf(found)
    }
    if (next !== undefined) { event.preventDefault(); event.stopPropagation(); focusMenuEntry(entries[next]) }
  }
  menu.addEventListener('keydown', keydown)
  return () => menu.removeEventListener('keydown', keydown)
}

/** Viewport placement is shared by framework and native-select adapters. */
export function positionDropdownMenu(anchor: HTMLElement, menu: HTMLElement): void {
  const rect = anchor.getBoundingClientRect(), style = window.getComputedStyle(menu)
  const dimension = style.getPropertyValue('--agentic-menu-edge-gap').trim()
  const edge = parseFloat(dimension) * (dimension.endsWith('rem') ? parseFloat(window.getComputedStyle(document.documentElement).fontSize) : 1) || 8
  menu.style.width = `max(var(--agentic-menu-min-width), ${rect.width}px)`
  menu.style.maxWidth = `calc(100vw - ${edge * 2}px)`
  menu.style.maxHeight = `calc(100dvh - ${edge * 2}px)`
  const size = menu.getBoundingClientRect(), viewport = window.visualViewport
  const width = viewport?.width || window.innerWidth, height = viewport?.height || window.innerHeight
  const left = viewport?.offsetLeft || 0, top = viewport?.offsetTop || 0
  const below = rect.bottom + edge, above = rect.top - size.height - edge
  menu.style.left = `${Math.max(left + edge, Math.min(rect.right - size.width, left + width - size.width - edge))}px`
  menu.style.top = `${Math.max(top + edge, Math.min(below + size.height <= top + height - edge ? below : above, top + height - size.height - edge))}px`
}

/** One-open coordination, positioning, outside dismissal and focus lifecycle. */
export function bindDropdownPopup(anchor: HTMLElement, menu: HTMLElement, dismiss: (restoreFocus: boolean) => void): () => void {
  let active = true
  emitDropdownOpen(menu.id)
  const unsubscribe = subscribeDropdownOpen(detail => { if (detail.sourceId !== menu.id) dismiss(false) })
  const keyboard = bindMenuKeyboard(menu, dismiss)
  const place = () => { if (!anchor.isConnected || anchor.matches(':disabled')) dismiss(false); else positionDropdownMenu(anchor, menu) }
  const outside = (event: PointerEvent) => {
    const route = event.composedPath()
    if (route.includes(anchor) || route.includes(menu)) return
    // Inspection and other owners can cancel a gesture later in its propagation.
    queueMicrotask(() => { if (active && !event.defaultPrevented) dismiss(false) })
  }
  document.addEventListener('pointerdown', outside, true)
  window.addEventListener('resize', place)
  window.addEventListener('scroll', place, true)
  window.visualViewport?.addEventListener('resize', place)
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place)
  observer?.observe(anchor)
  place()
  focusMenuEntry(menuEntries(menu).find(entry => entry.getAttribute('aria-checked') === 'true') || menuEntries(menu)[0])
  return () => {
    active = false
    unsubscribe(); keyboard(); observer?.disconnect()
    document.removeEventListener('pointerdown', outside, true)
    window.removeEventListener('resize', place)
    window.removeEventListener('scroll', place, true)
    window.visualViewport?.removeEventListener('resize', place)
  }
}
