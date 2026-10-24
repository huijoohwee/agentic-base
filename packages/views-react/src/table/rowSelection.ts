import type { ViewRow } from '../kanban/KanbanHostContext'

type RowSelectionHierarchy = {
  rowIds: string[]
  groupIds: Set<string>
  descendantRowIdsById: Map<string, string[]>
  descendantLeafIdsById: Map<string, string[]>
  ancestorIdsById: Map<string, string[]>
}

type RowDepth = { id: string; depth: number }

export function readNestedRowDepth(row: ViewRow, levelIndex = -1, indentIndex = -1): number {
  const level = levelIndex < 0 ? '' : String(row.cells[levelIndex] ?? '').trim()
  const levelMatch = /^L(\d+)$/i.exec(level)
  const explicitLevel = levelMatch ? Number.parseInt(levelMatch[1]!, 10) : 0
  if (explicitLevel > 0) return Math.min(8, explicitLevel)
  const indent = indentIndex < 0 ? 0 : Number.parseInt(String(row.cells[indentIndex] ?? '').trim(), 10)
  return Number.isFinite(indent) && indent > 0 ? Math.min(8, Math.floor(indent / 2)) : 0
}

export function buildRowSelectionHierarchy(
  rows: readonly ViewRow[],
  levelIndex: number,
  indentIndex: number,
): RowSelectionHierarchy {
  const nodes: RowDepth[] = rows.map(row => ({ id: row.id, depth: readNestedRowDepth(row, levelIndex, indentIndex) }))
  const ancestorsById = new Map<string, string[]>()
  const descendantRowIdsById = new Map<string, string[]>(nodes.map(node => [node.id, []]))
  const childCounts = new Map<string, number>()
  const stack: RowDepth[] = []

  for (const node of nodes) {
    while (stack.length && stack[stack.length - 1]!.depth >= node.depth) stack.pop()
    const ancestors = stack.map(ancestor => ancestor.id)
    ancestorsById.set(node.id, ancestors.reverse())
    for (const ancestorId of ancestors) descendantRowIdsById.get(ancestorId)?.push(node.id)
    const parent = stack[stack.length - 1]
    if (parent && parent.depth + 1 === node.depth) childCounts.set(parent.id, (childCounts.get(parent.id) ?? 0) + 1)
    stack.push(node)
  }

  const groupIds = new Set(childCounts.keys())
  const descendantLeafIdsById = new Map<string, string[]>()
  for (const groupId of groupIds) {
    descendantLeafIdsById.set(
      groupId,
      (descendantRowIdsById.get(groupId) ?? []).filter(rowId => !groupIds.has(rowId)),
    )
  }
  return { rowIds: nodes.map(node => node.id), groupIds, descendantRowIdsById, descendantLeafIdsById, ancestorIdsById: ancestorsById }
}

export function readRowSelectionState(
  rowId: string,
  selectedIds: ReadonlySet<string>,
  hierarchy: RowSelectionHierarchy,
): { checked: boolean; mixed: boolean } {
  const leaves = hierarchy.descendantLeafIdsById.get(rowId)
  if (!leaves?.length) return { checked: selectedIds.has(rowId), mixed: false }
  const selectedCount = leaves.reduce((count, leafId) => count + Number(selectedIds.has(leafId)), 0)
  return { checked: selectedCount === leaves.length, mixed: selectedCount > 0 && selectedCount < leaves.length }
}

export function readRowSelectionStates(
  selectedIds: ReadonlySet<string>,
  hierarchy: RowSelectionHierarchy,
): Map<string, { checked: boolean; mixed: boolean }> {
  const selectedLeafCounts = new Map<string, number>()
  for (const groupId of hierarchy.groupIds) selectedLeafCounts.set(groupId, 0)
  for (const rowId of hierarchy.rowIds) {
    if (hierarchy.groupIds.has(rowId) || !selectedIds.has(rowId)) continue
    for (const ancestorId of hierarchy.ancestorIdsById.get(rowId) ?? []) {
      if (hierarchy.groupIds.has(ancestorId)) selectedLeafCounts.set(ancestorId, (selectedLeafCounts.get(ancestorId) ?? 0) + 1)
    }
  }
  return new Map(hierarchy.rowIds.map(rowId => {
    const leaves = hierarchy.descendantLeafIdsById.get(rowId)
    if (!leaves?.length) return [rowId, { checked: selectedIds.has(rowId), mixed: false }]
    const selectedCount = selectedLeafCounts.get(rowId) ?? 0
    return [rowId, { checked: selectedCount === leaves.length, mixed: selectedCount > 0 && selectedCount < leaves.length }]
  }))
}

export function toggleHierarchicalRowSelection(
  rowId: string,
  selectedIds: readonly string[],
  hierarchy: RowSelectionHierarchy,
): string[] {
  const next = new Set(selectedIds)
  const checked = readRowSelectionState(rowId, next, hierarchy).checked
  const affectedIds = hierarchy.groupIds.has(rowId)
    ? [rowId, ...(hierarchy.descendantRowIdsById.get(rowId) ?? [])]
    : [rowId]
  for (const affectedId of affectedIds) {
    if (checked) next.delete(affectedId)
    else next.add(affectedId)
  }
  for (const ancestorId of hierarchy.ancestorIdsById.get(rowId) ?? []) {
    if (!hierarchy.groupIds.has(ancestorId)) continue
    const leaves = hierarchy.descendantLeafIdsById.get(ancestorId) ?? []
    if (leaves.length && leaves.every(leafId => next.has(leafId))) next.add(ancestorId)
    else next.delete(ancestorId)
  }
  return hierarchy.rowIds.filter(id => next.has(id))
}
