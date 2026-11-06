export type HierarchyGeometry = { top: number; height: number; depth: number; parent: boolean }

/** Keep the original header inside its table when an outer pane scrolls vertically. */
export function readStickyHeaderShift(top: number, height: number, tableBottom: number, viewportTop: number): number {
  return Math.max(0, Math.min(viewportTop - top, tableBottom - top - height))
}

function parentElements(element: HTMLElement): HTMLElement[] {
  const parents: HTMLElement[] = []
  let parent = element.parentElement ?? (element.getRootNode() as ShadowRoot).host as HTMLElement | undefined
  while (parent) {
    parents.push(parent)
    parent = parent.parentElement ?? (parent.getRootNode() as ShadowRoot).host as HTMLElement | undefined
  }
  return parents
}

/** Original rows only: pin the active ancestor path and release at each subtree boundary. */
export function readStickyHierarchy(rows: readonly HierarchyGeometry[], headerBottom: number): Map<number, number> {
  const positions = new Map<number, number>()
  let cursor = headerBottom
  let subtreeEnd = rows.length
  for (let index = 0; index < subtreeEnd; index += 1) {
    const row = rows[index]!
    if (!row.parent || row.top > cursor) continue
    let end = index + 1
    while (end < rows.length && rows[end]!.depth > row.depth) end += 1
    if (end === index + 1) continue // A collapsed group has nothing to keep in view.
    const last = rows[end - 1]!
    const bottom = last.top + last.height
    if (bottom <= cursor) continue
    const shift = Math.max(0, Math.min(cursor - row.top, bottom - row.top - row.height))
    positions.set(index, shift)
    subtreeEnd = end
    cursor = row.top + shift + row.height
  }
  return positions
}

/** One measured scroll owner for bounded grids and tables embedded in scrolling panes. */
export function bindStickyHierarchy(frame: HTMLElement): () => void {
  const ownerWindow = frame.ownerDocument.defaultView
  const table = frame.querySelector('table')
  const header = table?.tHead
  const body = table?.tBodies[0]
  if (!ownerWindow || !table || !header || !body) return () => {}
  const parents = parentElements(frame)
  const originalHeaderTransform = header.style.transform
  let headerShift = 0
  const moved = new Map<HTMLTableRowElement, { shift: number; transform: string; position: string; zIndex: string }>()
  const backgrounds = new Map<HTMLElement, string>()
  let pending = 0
  let stopped = false
  const restore = (row: HTMLTableRowElement) => {
    const original = moved.get(row)
    if (!original) return
    Object.assign(row.style, { transform: original.transform, position: original.position, zIndex: original.zIndex })
    delete row.dataset.agenticBaseStickyAncestor
    for (const cell of Array.from(row.cells)) {
      if (backgrounds.has(cell)) cell.style.backgroundColor = backgrounds.get(cell)!
      backgrounds.delete(cell)
    }
    moved.delete(row)
  }
  const update = () => {
    pending = 0
    if (stopped) return
    const tableBounds = table.getBoundingClientRect()
    const ownsVerticalScroll = frame.scrollHeight > frame.clientHeight + 1 || frame.clientHeight > tableBounds.height + 1
    const verticalParent = ownsVerticalScroll ? null : parents.find(parent =>
      /^(auto|scroll|overlay)$/.test(ownerWindow.getComputedStyle(parent).overflowY)
      && parent.scrollHeight > parent.clientHeight + 1)
    const viewportTop = ownsVerticalScroll ? frame.getBoundingClientRect().top + frame.clientTop
      : verticalParent ? verticalParent.getBoundingClientRect().top + verticalParent.clientTop : 0
    const headerBounds = header.getBoundingClientRect()
    headerShift = readStickyHeaderShift(headerBounds.top - headerShift, headerBounds.height, tableBounds.bottom, viewportTop)
    header.style.transform = headerShift ? `translateY(${headerShift}px) ${originalHeaderTransform}`.trim() : originalHeaderTransform
    const rows = Array.from(body.rows).filter(row => row.hasAttribute('data-agentic-base-row-depth'))
    const geometry = rows.map(row => {
      const bounds = row.getBoundingClientRect()
      return { top: bounds.top - (moved.get(row)?.shift ?? 0), height: bounds.height,
        depth: Number(row.dataset.agenticBaseRowDepth), parent: row.dataset.agenticBaseRowParent === 'true' }
    })
    const positions = readStickyHierarchy(geometry, header.getBoundingClientRect().bottom)
    const active = new Set([...positions.keys()].map(index => rows[index]!))
    for (const row of moved.keys()) if (!active.has(row)) restore(row)
    const headerBackground = ownerWindow.getComputedStyle(header).backgroundColor
    for (const [index, shift] of positions) {
      const row = rows[index]!
      if (!moved.has(row)) {
        moved.set(row, { shift: 0, transform: row.style.transform, position: row.style.position, zIndex: row.style.zIndex })
      }
      const rowBackground = ownerWindow.getComputedStyle(row).backgroundColor
      const background = rowBackground !== 'rgba(0, 0, 0, 0)' && rowBackground !== 'transparent'
        ? rowBackground : headerBackground
      for (const cell of Array.from(row.cells)) {
        if (!backgrounds.has(cell)) backgrounds.set(cell, cell.style.backgroundColor)
        cell.style.backgroundColor = background
      }
      moved.get(row)!.shift = shift
      Object.assign(row.style, { position: 'relative', transform: `translateY(${shift}px)`, zIndex: String(20 - geometry[index]!.depth) })
      row.dataset.agenticBaseStickyAncestor = 'true'
    }
    for (const [cell, background] of backgrounds) if (!body.contains(cell)) {
      cell.style.backgroundColor = background
      backgrounds.delete(cell)
    }
  }
  const schedule = () => { if (!pending && !stopped) pending = ownerWindow.requestAnimationFrame(update) }
  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null
  const observeRows = () => {
    resizeObserver?.disconnect()
    resizeObserver?.observe(frame)
    resizeObserver?.observe(header)
    for (const parent of parents) resizeObserver?.observe(parent)
    for (const row of Array.from(body.rows)) resizeObserver?.observe(row)
    schedule()
  }
  const mutations = new ownerWindow.MutationObserver(observeRows)
  mutations.observe(body, { childList: true, subtree: true, characterData: true,
    attributes: true, attributeFilter: ['data-agentic-base-row-depth', 'data-agentic-base-row-parent', 'class'] })
  for (const element of [frame, ...parents]) element.addEventListener('scroll', schedule, { passive: true })
  ownerWindow.addEventListener('scroll', schedule, { passive: true })
  ownerWindow.addEventListener('resize', schedule)
  observeRows()
  return () => {
    stopped = true
    if (pending) ownerWindow.cancelAnimationFrame(pending)
    mutations.disconnect()
    resizeObserver?.disconnect()
    for (const element of [frame, ...parents]) element.removeEventListener('scroll', schedule)
    ownerWindow.removeEventListener('scroll', schedule)
    ownerWindow.removeEventListener('resize', schedule)
    for (const row of moved.keys()) restore(row)
    for (const [cell, background] of backgrounds) cell.style.backgroundColor = background
    backgrounds.clear()
    header.style.transform = originalHeaderTransform
  }
}
