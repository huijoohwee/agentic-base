import assert from 'node:assert/strict'
import test from 'node:test'
import { readStickyHierarchy, readStickyHeaderShift } from '../packages/views-react/src/table/stickyHierarchy.ts'
const row = (top, height, depth, parent = false) => ({ top, height, depth, parent })
test('pins only the active nested ancestor path using measured variable heights', () => {
  const rows = [row(-100, 40, 0, true), row(-60, 60, 1, true), row(0, 40, 2), row(40, 40, 2), row(80, 40, 0, true), row(120, 40, 1)]
  assert.deepEqual([...readStickyHierarchy(rows, 20)], [[0, 120], [1, 80]])
})
test('releases old ancestors at their subtree boundary and pins the next root', () => {
  const rows = [row(-200, 40, 0, true), row(-160, 40, 1, true), row(-120, 40, 2), row(-80, 40, 0, true), row(-40, 40, 1), row(0, 80, 1)]
  assert.deepEqual([...readStickyHierarchy(rows, 20)], [[3, 100]])
})
test('collapsed groups and flat records never become sticky ancestors', () => {
  assert.equal(readStickyHierarchy([row(-100, 40, 0, true), row(-60, 40, 0), row(-20, 40, 0)], 20).size, 0)
})
test('nested group is pushed out before the next sibling without covering it', () => {
  const rows = [row(-120, 30, 0, true), row(-90, 40, 1, true), row(-50, 50, 2), row(0, 40, 1, true), row(40, 80, 2)]
  assert.deepEqual([...readStickyHierarchy(rows, 10)], [[0, 130], [3, 40]])
})

test('outer pane scrolling pins the original header at the pane edge', () => {
  assert.equal(readStickyHeaderShift(-120, 40, 360, 56), 176)
})
test('header remains at its natural position before reaching the scroll edge', () => {
  assert.equal(readStickyHeaderShift(160, 40, 500, 56), 0)
})
test('header releases at the table end without covering the following content', () => {
  const shift = readStickyHeaderShift(-300, 40, 70, 56)
  assert.equal(-300 + shift + 40, 70)
})
test('bounded-frame native sticky header receives no additional translation', () => {
  assert.equal(readStickyHeaderShift(99, 41, 1300, 99), 0)
})
