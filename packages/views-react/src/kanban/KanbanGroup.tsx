import React from 'react'
import type { ViewModel, ViewRow } from './KanbanHostContext'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { KanbanCard } from './KanbanCard'
import { KanbanLaneDragOverIndicator, KanbanLaneDropPreview } from './KanbanDropPreview'
import { KanbanNewRecordDividerRow } from './KanbanNewRecordDividerRow'
import { getKanbanLaneDragVisualState } from './kanbanDragVisualState'
import type { KanbanCardDragProps, KanbanCardDropProps, KanbanLaneDropProps } from './useKanbanDragAndDrop'
import type { KanbanDropPosition } from './kanbanReorder'
import { useKanbanHost } from './KanbanHostContext'

export type KanbanGroupModel = {
  key: string
  value?: string
  label?: string
  rows: ViewRow[]
}

export type KanbanGroupProps = {
  group: KanbanGroupModel
  canMutate: boolean
  view: ViewModel
  titleIndex: number
  groupByIndex: number
  moveTargets: string[]
  groupColumnOptions: string[]
  otherColumnIndices: number[]
  onUpdateCell: (args: { rowId: string; columnId: string; nextValue: string }) => void
  onNewRecord: (seed?: Partial<Record<string, string>>) => void
  onActivateRow?: (rowId: string) => void
  isDragOver?: boolean
  getCardDragProps?: (args: { rowId: string; groupKey: string }) => KanbanCardDragProps
  getCardDropProps?: (args: { rowId: string; groupKey: string }) => KanbanCardDropProps
  laneDropProps?: KanbanLaneDropProps
  draggingRowId?: string | null
  dragOverRowId?: string | null
  dragOverPosition?: KanbanDropPosition
  onKeyboardMove?: (args: { rowId: string; direction: 'up' | 'down' | 'left' | 'right' }) => boolean
  showLaneDropPreview?: boolean
  laneScrollRef?: (element: HTMLOListElement | null) => void
  hasActiveDrag?: boolean
  isSourceLane?: boolean
  isCommitFlash?: boolean
  commitFlashRowId?: string | null
  laneDropPreviewLabel?: string
  getCardDropPreviewLabel?: (args: { rowId: string; groupKey: string }) => string
  onFocusableRowElement?: (args: { rowId: string; element: HTMLElement | null }) => void
}

export const KanbanGroup = React.memo(function KanbanGroup(props: KanbanGroupProps) {
  const host = useKanbanHost()
  const TagChip = host.components.TagChip
  const groupLabel = props.group.label ?? props.group.key
  const groupValue = props.group.value ?? props.group.key
  const groupByColumnId = String(props.view.groupByColumnId || '')
  const laneDragVisualState = getKanbanLaneDragVisualState({
    hasActiveDrag: !!props.hasActiveDrag,
    isDragOver: !!props.isDragOver,
    isSourceLane: !!props.isSourceLane,
    isCommitFlash: !!props.isCommitFlash,
    indicatorColor: host.primaryIndicator,
  })
  const [expanded, setExpanded] = React.useState(true)
  const toggleExpanded = React.useCallback(() => {
    setExpanded(prev => !prev)
  }, [])

  return (
    <li className="list-none">
      <section
        {...{ [host.markers.group]: '1' }}
        className={[
          host.classes.kanbanGroup,
          'relative flex-shrink-0 border transition-colors',
          host.classes.kanbanCardRadius,
          laneDragVisualState.className,
          host.theme.panel.border,
          host.theme.kanban.groupBg,
        ].join(' ')}
        style={laneDragVisualState.style}
        aria-label={`Group: ${groupLabel}`}
        {...props.laneDropProps}
      >
        {props.isDragOver ? <KanbanLaneDragOverIndicator /> : null}
        <header
          {...{ [host.markers.groupHeader]: '1' }}
          className={[host.classes.responsiveRow, 'gap-2 px-2 py-2 border-b', host.theme.panel.divider].join(' ')}
        >
          <button
            type="button"
            className={['flex items-center gap-2 flex-1 min-w-0 rounded', host.theme.button.hoverBg, host.theme.focus.primarySoftRing].join(' ')}
            aria-expanded={expanded}
            onClick={toggleExpanded}
            onKeyDown={e => {
              if (e.key === 'ArrowRight') {
                e.preventDefault()
                setExpanded(true)
              }
              if (e.key === 'ArrowLeft') {
                e.preventDefault()
                setExpanded(false)
              }
            }}
          >
            {expanded ? (
              <ChevronDown className={['w-4 h-4', host.theme.icon.color].join(' ')} aria-hidden="true" />
            ) : (
              <ChevronRight className={['w-4 h-4', host.theme.icon.color].join(' ')} aria-hidden="true" />
            )}
            <h3 className="min-w-0 flex items-center gap-2 m-0 text-sm font-medium">
              <TagChip value={groupLabel} />
              <span className={['inline-flex items-center justify-center w-5 h-5 rounded', host.theme.badge.chip, host.theme.text.secondary, 'text-xs'].join(' ')}>
                {props.group.rows.length}
              </span>
            </h3>
          </button>

          {props.canMutate ? (
            <menu
              {...{ [host.markers.groupActions]: '1' }}
              className="m-0 p-0 list-none flex shrink-0 items-center gap-1 transition-opacity"
              aria-label="Group actions"
            >
              <li className="list-none">
                <button
                  type="button"
                  className={[
                    host.classes.panelActionButton,
                    host.classes.panelIconButton,
                    host.classes.smallIconAction,
                    'rounded-md',
                    host.theme.focus.primarySoftRing,
                  ].join(' ')}
                  aria-label={`New record in ${groupLabel}`}
                  onClick={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    props.onNewRecord({ [groupByColumnId]: groupValue })
                  }}
                >
                  <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
                </button>
              </li>
            </menu>
          ) : null}
        </header>

        {expanded ? (
          <ol
            ref={props.laneScrollRef}
            {...{ [host.markers.groupList]: '1' }}
            className={host.classes.kanbanCardList}
            aria-label={`Cards in ${groupLabel}`}
          >
            {props.group.rows.map((row, index) => {
              const title = String(row.cells[props.titleIndex] ?? '')
              const rowGroupValue = String(row.cells[props.groupByIndex] ?? '').trim()
              return (
                <React.Fragment key={row.id}>
                  <li className="list-none">
                    <KanbanCard
                      row={row}
                      title={title}
                      groupValue={rowGroupValue}
                      canMutate={props.canMutate}
                      groupByColumnId={groupByColumnId}
                      groupByIndex={props.groupByIndex}
                      moveTargets={props.moveTargets}
                      groupColumnOptions={props.groupColumnOptions}
                      view={props.view}
                      otherColumnIndices={props.otherColumnIndices}
                      onUpdateCell={props.onUpdateCell}
                      onActivateRow={props.onActivateRow}
                      cardDragProps={props.getCardDragProps?.({ rowId: row.id, groupKey: props.group.key })}
                      cardDropProps={props.getCardDropProps?.({ rowId: row.id, groupKey: props.group.key })}
                      isDragging={props.draggingRowId === row.id}
                      isDropTarget={props.dragOverRowId === row.id}
                      dropPosition={props.dragOverPosition}
                      onKeyboardMove={props.onKeyboardMove}
                      hasActiveDrag={!!props.hasActiveDrag}
                      dropPreviewLabel={props.getCardDropPreviewLabel?.({ rowId: row.id, groupKey: props.group.key })}
                      isCommitFlash={props.commitFlashRowId === row.id}
                      onFocusableRowElement={props.onFocusableRowElement}
                    />
                  </li>
                  {props.canMutate && index < props.group.rows.length - 1 ? (
                    <KanbanNewRecordDividerRow onClick={() => props.onNewRecord({ [groupByColumnId]: groupValue })} />
                  ) : null}
                </React.Fragment>
              )
            })}

            {props.canMutate ? (
              <KanbanNewRecordDividerRow onClick={() => props.onNewRecord({ [groupByColumnId]: groupValue })} />
            ) : null}
            {props.showLaneDropPreview ? (
              <li className="list-none">
                <KanbanLaneDropPreview label={props.laneDropPreviewLabel || `Drop to place at end of ${groupLabel}`} compact />
              </li>
            ) : null}
          </ol>
        ) : null}
      </section>
    </li>
  )
})
