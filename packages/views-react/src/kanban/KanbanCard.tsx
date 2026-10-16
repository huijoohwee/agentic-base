import React from 'react'
import type { ViewModel, ViewRow } from './KanbanHostContext'
import { ArrowDown, ArrowRight, ArrowUp, ChevronDown, CircleChevronDown, Expand, Link2, List, MoreHorizontal, Trash2 } from 'lucide-react'
import { KanbanCardDropPreview } from './KanbanDropPreview'
import { buildKanbanCardDropIntentLabel } from './kanbanDragIntent'
import { getKanbanCardDragVisualState } from './kanbanDragVisualState'
import { isInteractiveEventTarget, useDismissableMenu } from './kanbanMenu'
import { KanbanCell } from './KanbanCell'
import { KanbanTypeBadge } from './KanbanTypeBadge'
import type { KanbanCardDragProps, KanbanCardDropProps } from './useKanbanDragAndDrop'
import type { KanbanDropPosition } from './kanbanReorder'
import { useKanbanHost } from './KanbanHostContext'

export type KanbanCardProps = {
  row: ViewRow
  title: string
  groupValue: string
  canMutate: boolean
  groupByColumnId: string
  groupByIndex: number
  moveTargets: string[]
  groupColumnOptions: string[]
  view: ViewModel
  otherColumnIndices: number[]
  onUpdateCell: (args: { rowId: string; columnId: string; nextValue: string }) => void
  onActivateRow?: (rowId: string) => void
  cardDragProps?: KanbanCardDragProps
  cardDropProps?: KanbanCardDropProps
  isDragging?: boolean
  isDropTarget?: boolean
  dropPosition?: KanbanDropPosition
  onKeyboardMove?: (args: { rowId: string; direction: 'up' | 'down' | 'left' | 'right' }) => boolean
  hasActiveDrag?: boolean
  dropPreviewLabel?: string
  isCommitFlash?: boolean
  onFocusableRowElement?: (args: { rowId: string; element: HTMLElement | null }) => void
}

export const KanbanCard = React.memo(function KanbanCard(props: KanbanCardProps) {
  const host = useKanbanHost()
  const TagChip = host.components.TagChip
  const StatusChip = host.components.StatusChip
  const InlineTextEditor = host.components.InlineTextEditor
  const articleRef = React.useRef<HTMLElement | null>(null)
  const setArticleRef = React.useCallback((element: HTMLElement | null) => {
    articleRef.current = element
    props.onFocusableRowElement?.({
      rowId: props.row.id,
      element,
    })
  }, [props.onFocusableRowElement, props.row.id])
  const dragVisualState = getKanbanCardDragVisualState({
    hasActiveDrag: !!props.hasActiveDrag,
    isDragging: !!props.isDragging,
    isDropTarget: !!props.isDropTarget,
    isCommitFlash: !!props.isCommitFlash,
    indicatorColor: host.primaryIndicator,
  })
  const isCoarsePointer = React.useMemo(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(hover: none)').matches
    } catch {
      return false
    }
  }, [])

  const statusOptions = props.groupColumnOptions.length ? props.groupColumnOptions : props.moveTargets
  const titleColumnIndex = React.useMemo(() => {
    return props.view.columns.findIndex(column => column.id === props.view.titleColumnId)
  }, [props.view.columns, props.view.titleColumnId])
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [moveMenuOpen, setMoveMenuOpen] = React.useState(false)
  const menuRootRef = React.useRef<HTMLElement>(null)
  const menuTriggerRef = React.useRef<HTMLButtonElement>(null)
  const firstMenuItemRef = React.useRef<HTMLButtonElement>(null)

  useDismissableMenu({
    open: menuOpen,
    onClose: () => {
      setMenuOpen(false)
      setMoveMenuOpen(false)
    },
    rootRef: menuRootRef,
    triggerRef: menuTriggerRef as React.RefObject<HTMLElement>,
  })

  React.useEffect(() => {
    if (!menuOpen) return
    firstMenuItemRef.current?.focus()
  }, [menuOpen])

  const onActivate = props.onActivateRow
    ? (event: React.MouseEvent<HTMLElement>) => {
        if (isInteractiveEventTarget(event.target, host.interactiveTargetSelector)) return
        if (isCoarsePointer) {
          const el = articleRef.current
          if (el && document.activeElement !== el) {
            try {
              el.focus()
            } catch {
              void 0
            }
            return
          }
        }
        props.onActivateRow?.(props.row.id)
      }
    : undefined

  const onActivateByKeyboard = (e: React.KeyboardEvent<HTMLElement>) => {
    if (isInteractiveEventTarget(e.target, host.interactiveTargetSelector)) return
    if (props.canMutate && (e.altKey || e.metaKey)) {
      const direction =
        e.key === 'ArrowUp'
          ? 'up'
          : e.key === 'ArrowDown'
            ? 'down'
            : e.key === 'ArrowLeft'
              ? 'left'
              : e.key === 'ArrowRight'
                ? 'right'
                : null
      if (direction) {
        const handled = props.onKeyboardMove?.({ rowId: props.row.id, direction })
        if (handled) {
          e.preventDefault()
          return
        }
      }
    }
    if ((e.key === 'Enter' || e.key === ' ') && props.onActivateRow) {
      e.preventDefault()
      props.onActivateRow(props.row.id)
      return
    }
    if (e.key === 'ArrowDown' && menuOpen) {
      e.preventDefault()
      firstMenuItemRef.current?.focus()
    }
  }

  const urlEntries = React.useMemo(() => {
    const out: Array<{ id: string; label: string; href: string }> = []
    for (const colIndex of props.otherColumnIndices) {
      const col = props.view.columns[colIndex]
      if (col.kind !== 'text') continue
      const raw = String(props.row.cells[colIndex] ?? '').trim()
      if (!raw) continue
      if (!raw.includes('://') && !raw.startsWith('mailto:')) continue
      out.push({ id: col.id, label: col.name || 'Link', href: raw })
    }
    return out
  }, [props.otherColumnIndices, props.row.cells, props.view.columns])

  const tags = React.useMemo(() => {
    const out: string[] = []
    for (const colIndex of props.otherColumnIndices) {
      const col = props.view.columns[colIndex]
      const raw = String(props.row.cells[colIndex] ?? '')
      if (!raw) continue
      if (col.kind === 'multi-select') {
        host.data.splitValues(raw).forEach(v => out.push(v))
        continue
      }
      if (col.kind === 'select') out.push(raw.trim())
    }
    return out
  }, [props.otherColumnIndices, props.row.cells, props.view.columns])

  const paragraphEntries = React.useMemo(() => {
    return host.data.buildParagraphEntries(
      props.otherColumnIndices.flatMap(colIndex => {
        const col = props.view.columns[colIndex]
        if (col.kind !== 'text') return []
        const raw = String(props.row.cells[colIndex] ?? '').trim()
        if (!raw) return []
        if (raw.includes('://') || raw.startsWith('mailto:')) return []
        return [{
          id: col.id,
          label: col.name || 'Text',
          value: raw,
        }]
      }),
      { excludeUrlLike: true },
    )
  }, [props.otherColumnIndices, props.row.cells, props.view.columns])

  const statusValue = String(props.groupValue || '').trim()
  const sharedDragRegionClassName = props.cardDragProps?.draggable ? 'cursor-grab active:cursor-grabbing' : ''
  const sharedDragRegionProps = props.cardDragProps?.draggable
    ? {
        draggable: props.cardDragProps.draggable,
        onDragStart: props.cardDragProps.onDragStart,
        onDragEnd: props.cardDragProps.onDragEnd,
      }
    : undefined

  return (
    <article
      ref={setArticleRef}
      {...{ [host.markers.card]: '1' }}
      className={[
        'group relative border transition-transform transition-shadow duration-150 ease-out',
        host.theme.kanban.cardBg,
        host.theme.kanban.cardHoverBg,
        host.classes.kanbanCardRadius,
        host.classes.kanbanCardShadow,
        host.classes.kanbanCardHoverShadow,
        host.theme.panel.border,
        dragVisualState.className,
        !props.isDragging ? 'hover:-translate-y-[1px] active:translate-y-0' : '',
        props.onActivateRow ? `cursor-pointer ${host.theme.focus.primarySofterRing}` : '',
      ].join(' ')}
      style={dragVisualState.style}
      tabIndex={props.onActivateRow ? 0 : undefined}
      role={props.onActivateRow ? 'button' : undefined}
      aria-grabbed={props.cardDragProps?.draggable ? props.isDragging : undefined}
      onDragEnter={props.cardDropProps?.onDragEnter}
      onDragOver={props.cardDropProps?.onDragOver}
      onDragLeave={props.cardDropProps?.onDragLeave}
      onDrop={props.cardDropProps?.onDrop}
      onClick={onActivate}
      onKeyDown={onActivateByKeyboard}
      aria-label={props.title ? `Card: ${props.title}` : 'Card'}
    >
      {props.isDropTarget ? (
        <KanbanCardDropPreview
          position={props.dropPosition || 'end'}
          label={props.dropPreviewLabel || buildKanbanCardDropIntentLabel({ position: props.dropPosition || 'end', targetCardLabel: props.title, targetLaneLabel: props.groupValue })}
        />
      ) : null}
      <header
        {...{ [host.markers.cardDragRegion]: '1' }}
        className={[
          'flex items-center justify-between gap-2 px-3 py-2 border-b',
          sharedDragRegionClassName,
          host.theme.panel.divider,
        ].join(' ')}
        aria-grabbed={props.cardDragProps?.draggable ? props.isDragging : undefined}
        {...sharedDragRegionProps}
      >
        <section className="flex items-center gap-2 min-w-0 flex-1">
          <KanbanTypeBadge size="sm" />
          <InlineTextEditor
            value={props.title}
            ariaLabel={`Title for ${props.row.id}`}
            placeholder="Add title"
            canEdit={props.canMutate && titleColumnIndex >= 0}
            onCommit={nextValue => {
              const titleColumn = titleColumnIndex >= 0 ? props.view.columns[titleColumnIndex] : null
              if (!titleColumn) return
              props.onUpdateCell({
                rowId: props.row.id,
                columnId: titleColumn.id,
                nextValue,
              })
            }}
            displayClassName={['text-sm font-semibold leading-5 m-0', host.classes.textTruncate, host.theme.text.primary].join(' ')}
            editorClassName={`${host.classes.cardTitleEditor} text-sm font-semibold leading-5`}
          />
        </section>
        <menu
          {...{ [host.markers.cardActions]: '1' }}
          className="m-0 p-0 list-none flex items-center gap-1 transition-opacity"
          aria-label="Card actions"
        >
          {props.onActivateRow ? (
            <li className="list-none">
              <button
                type="button"
          className={[host.classes.panelActionButton, host.classes.panelIconButton, host.classes.smallIconAction, 'rounded-md', host.theme.focus.primarySoftRing].join(' ')}
                aria-label={host.copy.expandCardLabel}
                onClick={e => {
                  e.stopPropagation()
                  props.onActivateRow?.(props.row.id)
                }}
              >
                <Expand className="w-4 h-4" aria-hidden="true" />
              </button>
            </li>
          ) : null}

          <li className="list-none">
            <section className="relative" ref={menuRootRef} onClick={e => e.stopPropagation()}>
              <button
                ref={menuTriggerRef}
                type="button"
                className={[host.classes.panelActionButton, host.classes.panelIconButton, host.classes.smallIconAction, 'rounded-md', host.theme.focus.primarySoftRing].join(' ')}
                aria-label={host.copy.cardMenuLabel}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                disabled={!props.canMutate}
                onClick={() => {
                  if (!props.canMutate) return
                  setMenuOpen(prev => !prev)
                  setMoveMenuOpen(false)
                }}
              >
                <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
              </button>

              {menuOpen && props.canMutate ? (
                <menu
                  className={[host.classes.kanbanFloatingMenu, 'absolute right-0 mt-2 rounded border shadow-[var(--base-shadow-overlay)] p-2 z-10', host.classes.compactMenuPanel, host.theme.panel.bg, host.theme.panel.border].join(' ')}
                  role="menu"
                  aria-label={host.copy.cardActionsLabel}
                >
                  <li className="list-none">
                    <button
                      ref={firstMenuItemRef}
                      type="button"
                      className={[host.classes.menuRow, 'gap-3 px-2 py-1.5 rounded text-sm', host.theme.button.hoverBg].join(' ')}
                      role="menuitem"
                      onClick={() => {
                        props.onActivateRow?.(props.row.id)
                        setMenuOpen(false)
                        setMoveMenuOpen(false)
                      }}
                    >
                      <Expand className={['w-4 h-4 shrink-0', host.theme.icon.color].join(' ')} aria-hidden="true" />
                      <span className={host.classes.textTruncate}>{host.copy.expandCardLabel}</span>
                    </button>
                  </li>
                  <li className="list-none">
                    <button
                      type="button"
                      className={[host.classes.menuRow, 'gap-3 px-2 py-1.5 rounded text-sm', host.theme.button.hoverBg].join(' ')}
                      role="menuitem"
                      aria-haspopup="menu"
                      aria-expanded={moveMenuOpen}
                      onClick={() => setMoveMenuOpen(prev => !prev)}
                      onKeyDown={e => {
                        if (e.key === 'ArrowRight') {
                          e.preventDefault()
                          setMoveMenuOpen(true)
                        }
                        if (e.key === 'ArrowLeft') {
                          e.preventDefault()
                          setMoveMenuOpen(false)
                        }
                      }}
                    >
                      <ArrowRight className={['w-4 h-4 shrink-0', host.theme.icon.color].join(' ')} aria-hidden="true" />
                      <span className={['min-w-0 flex-1 text-left', host.classes.textTruncate].join(' ')}>{host.copy.moveToLabel}</span>
                      <ChevronDown className={['w-4 h-4 shrink-0 transition-transform', moveMenuOpen ? 'rotate-180' : '', host.theme.icon.color].join(' ')} aria-hidden="true" />
                    </button>
                    {moveMenuOpen ? (
                      <menu
                        className={[host.classes.kanbanFloatingMenuChildren, host.classes.clickExpandMenuChildren, 'mt-1 m-0 list-none'].join(' ')}
                        role="menu"
                        aria-label="Move targets"
                      >
                        {props.moveTargets.map((t, index) => (
                          <li key={`${props.row.id}:move:${t}:${index}`} className="list-none">
                            <button
                              type="button"
                              className={[host.classes.menuRow, 'text-left px-2 py-1.5 rounded text-sm', host.theme.button.hoverBg].join(' ')}
                              role="menuitem"
                              onClick={() => {
                                if (!props.canMutate) return
                                props.onUpdateCell({ rowId: props.row.id, columnId: props.groupByColumnId, nextValue: t })
                                setMenuOpen(false)
                                setMoveMenuOpen(false)
                              }}
                            >
                              <span className={host.classes.textTruncate}>{t || host.copy.ungroupedLabel}</span>
                            </button>
                          </li>
                        ))}
                      </menu>
                    ) : null}
                  </li>
                  <li className={['list-none my-2 h-px', host.theme.panel.divider].join(' ')} />
                  <li className="list-none">
                    <button type="button" className={[host.classes.menuRow, 'gap-3 px-2 py-1.5 rounded text-sm opacity-60', host.theme.button.hoverBg].join(' ')} role="menuitem" disabled>
                      <ArrowUp className={['w-4 h-4 shrink-0', host.theme.icon.color].join(' ')} aria-hidden="true" />
                      <span className={host.classes.textTruncate}>Insert Before</span>
                    </button>
                  </li>
                  <li className="list-none">
                    <button type="button" className={[host.classes.menuRow, 'gap-3 px-2 py-1.5 rounded text-sm opacity-60', host.theme.button.hoverBg].join(' ')} role="menuitem" disabled>
                      <ArrowDown className={['w-4 h-4 shrink-0', host.theme.icon.color].join(' ')} aria-hidden="true" />
                      <span className={host.classes.textTruncate}>Insert After</span>
                    </button>
                  </li>
                  <li className={['list-none my-2 h-px', host.theme.panel.divider].join(' ')} />
                  <li className="list-none">
                    <button type="button" className={[host.classes.menuRow, 'gap-3 px-2 py-1.5 rounded text-sm opacity-60', host.theme.button.hoverBg].join(' ')} role="menuitem" disabled>
                      <Trash2 className={['w-4 h-4 shrink-0', host.theme.icon.color].join(' ')} aria-hidden="true" />
                      <span className={host.classes.textTruncate}>Delete Card</span>
                    </button>
                  </li>
                </menu>
              ) : null}
            </section>
          </li>
        </menu>
      </header>

      <section
        {...{ [host.markers.cardDragRegion]: '1' }}
        className={['px-3 py-2', sharedDragRegionClassName].join(' ')}
        aria-label="Card body"
        {...sharedDragRegionProps}
      >
        <section className="flex items-center gap-2 mb-2" aria-label="Status">
          <CircleChevronDown className={['w-4 h-4', host.theme.icon.color].join(' ')} aria-hidden="true" />
          <StatusChip value={statusValue} checked={false} hideIcon />
        </section>

        {tags.length ? (
          <section className="flex items-center gap-2 mb-2" aria-label="Tags">
            <List className={['w-4 h-4', host.theme.icon.color].join(' ')} aria-hidden="true" />
            <ul className={`${host.classes.toolbarRowScroll} gap-1 list-none p-0 m-0`} aria-label="Tag list">
              {tags.map((t, index) => (
                <li key={`${props.row.id}:tag:${t}:${index}`} className="list-none">
                  <TagChip value={t} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {urlEntries.length ? (
          <section className="flex items-center gap-2 mb-2" aria-label="Links">
            <Link2 className={['w-4 h-4', host.theme.icon.color].join(' ')} aria-hidden="true" />
            <ul className="flex flex-col gap-1 list-none p-0 m-0" aria-label="Link list">
              {urlEntries.map(u => (
                <li key={u.id} className="list-none">
                  <a
                    className={['text-xs underline underline-offset-2 truncate block', host.theme.text.secondary].join(' ')}
                    href={u.href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    title={u.href}
                  >
                    {u.href}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {paragraphEntries.length ? (
          <section className="flex flex-col gap-2 mb-2" aria-label="Details">
            {paragraphEntries.map(entry => {
              return (
                <section key={`${props.row.id}:text:${entry.id}`} className="rounded border border-black/5 bg-black/[0.025] px-2.5 py-2">
                  <p className={['m-0 text-xs font-semibold uppercase tracking-normal', host.theme.text.tertiary].join(' ')}>
                    {entry.label}
                  </p>
                  <InlineTextEditor
                    value={entry.value}
                    ariaLabel={`${entry.label} for ${props.row.id}`}
                    placeholder={`Add ${entry.label.toLowerCase()}`}
                    canEdit={props.canMutate}
                    multiline
                    rows={3}
                    onCommit={nextValue => {
                      props.onUpdateCell({
                        rowId: props.row.id,
                        columnId: entry.id,
                        nextValue,
                      })
                    }}
                    displayClassName={['m-0 mt-1 text-xs leading-5', host.theme.text.secondary].join(' ')}
                    editorClassName={`mt-1 ${host.classes.cardMultilineEditor} text-xs leading-5`}
                  />
                </section>
              )
            })}
          </section>
        ) : null}

        {props.canMutate ? (
          <KanbanCell
            rowId={props.row.id}
            groupByColumnId={props.groupByColumnId}
            value={String(props.row.cells[props.groupByIndex] ?? '')}
            options={statusOptions}
            onUpdateCell={props.onUpdateCell}
          />
        ) : null}
      </section>
    </article>
  )
})
