import React from 'react'
import { useKanbanHost } from './KanbanHostContext'

export const KanbanTypeBadge = React.memo(function KanbanTypeBadge(props: { size?: 'sm' | 'md' }) {
  const host = useKanbanHost()
  const size = props.size || 'md'
  const sizeClass = size === 'sm' ? 'w-4 h-4 text-xs' : 'w-5 h-5 text-xs'
  return (
    <span
      className={[
        'inline-flex items-center justify-center font-semibold',
        sizeClass,
        host.theme.icon.color,
      ].join(' ')}
      aria-label="Type"
    >
      T
    </span>
  )
})
