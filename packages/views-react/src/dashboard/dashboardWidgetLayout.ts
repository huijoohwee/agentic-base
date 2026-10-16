export type DashboardWidgetSnapGrid = { enabled: boolean; x: number; y?: number }
export type DashboardWidgetColumnStyle = { width: string; gap: number }

/** Keep saved display rows stable while dropping missing and duplicate widget IDs. */
export function dashboardWidgetRows(saved: readonly (readonly string[])[] | undefined, ids: readonly string[], columns: number): string[][] {
  const available = new Set(ids), seen = new Set<string>()
  const rows = (saved ?? []).map(row => row.filter(id => {
    if (!available.has(id) || seen.has(id)) return false
    seen.add(id); return true
  })).filter(row => row.length)
  const missing = [...new Set(ids)].filter(id => !seen.has(id))
  columns = Math.max(1, Math.min(12, Math.floor(columns) || 1))
  for (let i = 0; i < missing.length; i += columns) rows.push(missing.slice(i, i + columns))
  return rows
}

/** Compute responsive columns, optionally quantized to a caller-owned grid. */
export function dashboardColumnStyle(width: number, columns: number, grid: DashboardWidgetSnapGrid): DashboardWidgetColumnStyle {
  columns = Math.max(1, Math.min(12, Math.floor(columns) || 1))
  const size = Number.isFinite(grid.x) && grid.x > 0 ? grid.x : 10
  const snap = (value: number) => Math.round(value / size) * size
  const gap = grid.enabled ? Math.max(size, snap(12)) : 12
  const available = Math.max(0, (Math.max(0, Number.isFinite(width) ? width : 0) - gap * (columns - 1)) / columns)
  const snapped = Math.min(snap(available), Math.floor(available / size) * size)
  return { gap, width: grid.enabled && snapped > 0 ? `${snapped}px` : `calc((100% - ${gap * (columns - 1)}px) / ${columns})` }
}
