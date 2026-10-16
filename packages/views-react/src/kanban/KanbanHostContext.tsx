import React from 'react'
import type { ComponentType } from 'react'

export type KanbanInlineTextEditorProps = {
  value: string
  ariaLabel: string
  placeholder: string
  canEdit?: boolean
  multiline?: boolean
  rows?: number
  displayClassName?: string
  editorClassName?: string
  onCommit?: (nextValue: string) => void
}

export type KanbanParagraphCandidate = { id: string; label: string; value: unknown }
export type KanbanParagraphEntry = { id: string; label: string; value: string }

/** Source-neutral record projection consumed by shared view components. */
export type ViewColumnKind = 'text' | 'select' | 'multi-select'
export type ViewColumn = { id: string; name: string; kind: ViewColumnKind; options?: string[] }
export type ViewRow = { id: string; cells: string[] }
export type ViewModel = {
  columns: ViewColumn[]
  rows: ViewRow[]
  titleColumnId: string
  groupByColumnId: string | null
}

export type KanbanHostAdapter = {
  theme: {
    badge: { chip: string }
    button: { hoverBg: string }
    focus: { primarySoftRing: string; primarySofterRing: string }
    icon: { color: string }
    input: { border: string; text: string }
    kanban: { cardBg: string; cardHoverBg: string; cellBg: string; groupBg: string }
    panel: { bg: string; border: string; divider: string }
    text: { primary: string; secondary: string; tertiary: string }
  }
  classes: {
    cardMultilineEditor: string
    cardTitleEditor: string
    compactMenuPanel: string
    clickExpandMenuChildren: string
    kanbanCardList: string
    kanbanCardHoverShadow: string
    kanbanCardRadius: string
    kanbanCardShadow: string
    kanbanDropIndicator: string
    kanbanFloatingMenu: string
    kanbanFloatingMenuChildren: string
    kanbanGroup: string
    kanbanStatusRow: string
    menuRow: string
    panelActionButton: string
    panelBackground: string
    panelIconButton: string
    responsiveRow: string
    smallIconAction: string
    textTruncate: string
    toolbarRowScroll: string
  }
  copy: {
    cardActionsLabel: string
    cardMenuLabel: string
    expandCardLabel: string
    kanbanViewLabel: string
    moveToLabel: string
    ungroupedLabel: string
  }
  primaryIndicator: string
  interactiveTargetSelector?: string
  markers: {
    card: string
    cardActions: string
    cardDragRegion: string
    divider: string
    group: string
    groupActions: string
    groupHeader: string
    groupList: string
  }
  components: {
    InlineTextEditor: ComponentType<KanbanInlineTextEditorProps>
    NewRecordButton: ComponentType<{ onClick: () => void; presentation: 'divider' }>
    StatusChip: ComponentType<{ value: string; checked?: boolean; hideIcon?: boolean }>
    TagChip: ComponentType<{ value: string }>
  }
  data: {
    buildParagraphEntries: (
      candidates: readonly KanbanParagraphCandidate[],
      options?: { excludeUrlLike?: boolean },
    ) => KanbanParagraphEntry[]
    splitValues: (value: string) => string[]
  }
}

const KanbanHostContext = React.createContext<KanbanHostAdapter | null>(null)

export const KanbanHostProvider = KanbanHostContext.Provider

export const useKanbanHost = (): KanbanHostAdapter => {
  const host = React.useContext(KanbanHostContext)
  if (!host) throw new Error('Kanban view requires a host adapter')
  return host
}
