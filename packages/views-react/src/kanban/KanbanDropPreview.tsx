import React from 'react'
import { ArrowDownToLine, ArrowUpToLine, CornerDownRight } from 'lucide-react'
import type { KanbanDropPosition } from './kanbanReorder'
import { useKanbanHost } from './KanbanHostContext'

export function KanbanDropIndicator(props: { className?: string }) {
  const host = useKanbanHost()
  return (
    <section
      className={[host.classes.kanbanDropIndicator, props.className].filter(Boolean).join(' ')}
      style={{ backgroundColor: host.primaryIndicator }}
      aria-hidden="true"
    />
  )
}

export function KanbanLaneDragOverIndicator() {
  return <KanbanDropIndicator className="absolute inset-x-0 top-0" />
}

export function KanbanCardDropPreview(props: { position: KanbanDropPosition; label?: string }) {
  const host = useKanbanHost()
  if (props.position === 'end') return null
  if (props.position === 'left' || props.position === 'right') return <section aria-hidden="true"
    className={`pointer-events-none absolute inset-y-0 z-10 w-1 ${props.position === 'left' ? 'left-0' : 'right-0'}`}
    style={{ backgroundColor: host.primaryIndicator }}>
    <span className={['absolute top-2 whitespace-nowrap rounded border p-1 text-xs', host.classes.panelBackground, props.position === 'left' ? 'left-1' : 'right-1'].join(' ')}>
      {props.label || `Insert ${props.position}`}
    </span>
  </section>
  const top = props.position === 'before'
  const Icon = top ? ArrowUpToLine : ArrowDownToLine
  const label = props.label || (top ? 'Insert before' : 'Insert after')
  return (
    <section
      className={['pointer-events-none absolute inset-x-2 z-10 flex items-center gap-2', top ? 'top-0 -translate-y-1/2' : 'bottom-0 translate-y-1/2'].join(' ')}
      aria-hidden="true"
    >
      <KanbanDropIndicator className="flex-1 rounded-full" />
      <span
        className={[
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium shadow-[var(--base-shadow-raised)]',
          host.theme.panel.border,
          host.theme.panel.bg,
          host.theme.text.secondary,
        ].join(' ')}
      >
        <Icon className="h-3 w-3" aria-hidden="true" />
        <span>{label}</span>
      </span>
    </section>
  )
}

export function KanbanLaneDropPreview(props: { label: string; compact?: boolean }) {
  const host = useKanbanHost()
  return (
    <section
      className={[
        'rounded-md border border-dashed px-3 py-3 text-center',
        props.compact ? 'mt-2' : 'm-2',
        host.theme.panel.border,
        host.theme.panel.bg,
        host.theme.text.tertiary,
      ].join(' ')}
      style={{ borderColor: host.primaryIndicator }}
      aria-hidden="true"
    >
      <section className="flex items-center justify-center gap-2 text-xs font-medium">
        <CornerDownRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{props.label}</span>
      </section>
    </section>
  )
}
