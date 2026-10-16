import React from 'react'

export type DashboardCardAccent = 'primary' | 'secondary' | 'success' | 'warning' | 'neutral'
export type DashboardCard = {
  id: string
  accent?: DashboardCardAccent
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  content?: React.ReactNode
  actions?: React.ReactNode
}

export type DashboardCardGridProps = {
  ariaLabel: string
  cards: readonly DashboardCard[]
  columns?: 2 | 3 | 4
  className?: string
  cardClassName?: string
  eyebrowClassName?: string
  titleClassName?: string
  descriptionClassName?: string
  accentClassNameByRole?: Partial<Record<DashboardCardAccent, string>>
}

const GRID_COLUMNS: Record<NonNullable<DashboardCardGridProps['columns']>, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4',
}

export function DashboardCardGrid({
  ariaLabel,
  cards,
  columns = 3,
  className = '',
  cardClassName = '',
  eyebrowClassName = '',
  titleClassName = '',
  descriptionClassName = '',
  accentClassNameByRole = {},
}: DashboardCardGridProps) {
  return <ol aria-label={ariaLabel} className={['grid min-w-0 gap-3', GRID_COLUMNS[columns], className].filter(Boolean).join(' ')}>
    {cards.map(card => <li key={card.id} className={[
      'min-w-0 rounded border p-3',
      accentClassNameByRole[card.accent || 'neutral'] || '',
      cardClassName,
    ].filter(Boolean).join(' ')}>
      {card.eyebrow != null ? <p className={['text-xs', eyebrowClassName].filter(Boolean).join(' ')}>{card.eyebrow}</p> : null}
      <h3 className={['font-semibold', titleClassName].filter(Boolean).join(' ')}>{card.title}</h3>
      {card.description != null ? <p className={['py-1 text-xs', descriptionClassName].filter(Boolean).join(' ')}>{card.description}</p> : null}
      {card.content != null ? <div className="min-w-0 pb-2 text-xs">{card.content}</div> : null}
      {card.actions != null ? <div className="flex flex-wrap gap-2">{card.actions}</div> : null}
    </li>)}
  </ol>
}
