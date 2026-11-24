import React from 'react'
import type { KanbanHostAdapter } from '../kanban/KanbanHostContext'
import { BaseTagChip } from '../table/BaseTableHost'

/** The same board used by React consumers, with literal cells and no editor actions. */
export const browserKanbanHost: KanbanHostAdapter = {
  literalText: true,
  initialGroupSize: 12,
  theme: {
    badge: { chip: 'base-board-count' }, button: { hoverBg: 'agentic-base-button-hover' },
    focus: { primarySoftRing: 'base-board-focus', primarySofterRing: 'base-board-focus' },
    icon: { color: 'agentic-base-icon-color' },
    input: { border: 'agentic-base-panel-border', text: 'agentic-base-text-primary' },
    kanban: { cardBg: 'base-board-card', cardHoverBg: 'agentic-base-button-hover', cellBg: '', groupBg: 'base-board-lane' },
    panel: { bg: 'agentic-base-surface', border: 'agentic-base-panel-border', divider: 'base-board-divider' },
    text: { primary: 'agentic-base-text-primary', secondary: 'agentic-base-text-secondary', tertiary: 'agentic-base-text-tertiary' },
  },
  classes: {
    cardMultilineEditor: '', cardTitleEditor: 'base-board-title', compactMenuPanel: '', clickExpandMenuChildren: '',
    kanbanCardList: 'base-board-cards', kanbanCardHoverShadow: '', kanbanCardRadius: 'base-board-rounded', kanbanCardShadow: '',
    kanbanDropIndicator: '', kanbanFloatingMenu: '', kanbanFloatingMenuChildren: '', kanbanGroup: 'base-board-lane',
    kanbanStatusRow: '', menuRow: '', panelActionButton: 'base-board-button', panelBackground: 'agentic-base-surface',
    panelIconButton: '', responsiveRow: 'agentic-base-element-row', smallIconAction: '', textTruncate: 'agentic-base-text-truncate',
    toolbarRowScroll: 'agentic-base-toolbar-row-scroll',
  },
  copy: { cardActionsLabel: 'Card actions', cardMenuLabel: 'Card menu', expandCardLabel: 'Inspect record',
    kanbanViewLabel: 'Kanban board', moveToLabel: 'Move to', ungroupedLabel: 'Ungrouped' },
  primaryIndicator: 'var(--agentic-base-accent)',
  markers: { card: 'data-base-card', cardActions: 'data-base-card-actions', cardDragRegion: 'data-base-card-content',
    divider: 'data-base-divider', group: 'data-base-group', groupActions: 'data-base-group-actions',
    groupHeader: 'data-base-group-header', groupList: 'data-base-group-list' },
  components: {
    InlineTextEditor: ({ value, ariaLabel, displayClassName }) => <span className={displayClassName} aria-label={ariaLabel}>{value}</span>,
    NewRecordButton: () => null, StatusChip: BaseTagChip, TagChip: BaseTagChip,
  },
  data: {
    buildParagraphEntries: items => items.map(item => ({ ...item, value: String(item.value) })),
    splitValues: value => value.split(/[,\n]/u).map(item => item.trim()).filter(Boolean),
  },
}
