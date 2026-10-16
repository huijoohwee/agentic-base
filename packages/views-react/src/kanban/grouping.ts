import type { ViewModel, ViewRow } from './KanbanHostContext'
export const dataViewGroupId = (value: string): string => value.trim() ? `value:${value.trim()}` : 'empty:'
export const dataViewGroupValue = (id: string): string => id === 'empty:' ? '' : id.slice(6)
export const dataViewGroupLabel = (id: string, ungroupedLabel: string): string => dataViewGroupValue(id) || ungroupedLabel
export type DataViewGroup = { key: string; value: string; label: string; rows: ViewRow[] }
export function projectDataViewGroups(view: ViewModel, columnId: string | null, ungroupedLabel: string): DataViewGroup[] {
  const index = view.columns.findIndex(c => c.id === columnId)
  if (index < 0) return []
  const groups = new Map<string, DataViewGroup>()
  const ensure = (value: string) => {
    const key = dataViewGroupId(value)
    if (!groups.has(key)) groups.set(key, { key, value: value.trim(), label: dataViewGroupLabel(key, ungroupedLabel), rows: [] })
    return groups.get(key)!
  }
  for (const option of view.columns[index].options || []) ensure(option)
  for (const row of view.rows) ensure(String(row.cells[index] ?? '')).rows.push(row)
  ensure('')
  return [...groups.values()]
}
