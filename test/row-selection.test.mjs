import assert from 'node:assert/strict'
import test from 'node:test'
import { buildRowSelectionHierarchy, readRowSelectionStates, toggleHierarchicalRowSelection } from '../packages/views-react/src/table/rowSelection.ts'

const rows = [
  { id: 'group-a', cells: ['', '0', 'Group A'] },
  { id: 'a-1', cells: ['L1', '2', 'First child'] },
  { id: 'a-2', cells: ['L1', '2', 'Second child'] },
  { id: 'group-b', cells: ['', '0', 'Group B'] },
  { id: 'b-1', cells: ['L1', '2', 'Other group child'] },
]
const hierarchy = buildRowSelectionHierarchy(rows, 0, 1)

test('group checkbox selects and clears its child rows', () => {
  const selected = toggleHierarchicalRowSelection('group-a', [], hierarchy)
  assert.deepEqual(selected, ['group-a', 'a-1', 'a-2'])
  assert.deepEqual(readRowSelectionStates(new Set(selected), hierarchy).get('group-a'), { checked: true, mixed: false })
  assert.deepEqual(toggleHierarchicalRowSelection('group-a', selected, hierarchy), [])
})

test('child toggles update the group checked and mixed states', () => {
  const firstChild = toggleHierarchicalRowSelection('a-1', [], hierarchy)
  assert.deepEqual(readRowSelectionStates(new Set(firstChild), hierarchy).get('group-a'), { checked: false, mixed: true })

  const allChildren = toggleHierarchicalRowSelection('a-2', firstChild, hierarchy)
  assert.deepEqual(allChildren, ['group-a', 'a-1', 'a-2'])
  assert.deepEqual(readRowSelectionStates(new Set(allChildren), hierarchy).get('group-a'), { checked: true, mixed: false })

  const partialAgain = toggleHierarchicalRowSelection('a-2', allChildren, hierarchy)
  assert.deepEqual(partialAgain, ['a-1'])
  assert.deepEqual(readRowSelectionStates(new Set(partialAgain), hierarchy).get('group-a'), { checked: false, mixed: true })
  assert.deepEqual(readRowSelectionStates(new Set(partialAgain), hierarchy).get('group-b'), { checked: false, mixed: false })
})

test('selecting a mixed group completes all its descendants', () => {
  const partial = toggleHierarchicalRowSelection('a-1', [], hierarchy)
  const completed = toggleHierarchicalRowSelection('group-a', partial, hierarchy)
  assert.deepEqual(completed, ['group-a', 'a-1', 'a-2'])
  assert.deepEqual(readRowSelectionStates(new Set(completed), hierarchy).get('group-a'), { checked: true, mixed: false })
})
