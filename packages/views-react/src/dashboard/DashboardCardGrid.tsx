import React from 'react'
import '../browser/shared-ui-profile.css'

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
  headingLevel?: 3 | 4
  cards: readonly DashboardCard[]
  columns?: 2 | 3 | 4
  className?: string
  cardClassName?: string
  eyebrowClassName?: string
  titleClassName?: string
  descriptionClassName?: string
  accentClassNameByRole?: Partial<Record<DashboardCardAccent, string>>
}

export function DashboardCardGrid({
  ariaLabel,
  cards,
  columns = 3,
  headingLevel = 3,
  className = '',
  cardClassName = '',
  eyebrowClassName = '',
  titleClassName = '',
  descriptionClassName = '',
  accentClassNameByRole = {},
}: DashboardCardGridProps) {
  const Heading = headingLevel === 4 ? 'h4' : 'h3'
  return <section className="agentic-dashboard-region"><ol aria-label={ariaLabel} data-columns={columns} className={['agentic-dashboard-grid', className].filter(Boolean).join(' ')}>
    {cards.map(card => <li key={card.id} data-accent={card.accent} className={[
      'agentic-dashboard-card',
      accentClassNameByRole[card.accent || 'neutral'] || '',
      cardClassName,
    ].filter(Boolean).join(' ')}>
      {card.eyebrow != null ? <p className={['agentic-dashboard-eyebrow', eyebrowClassName].filter(Boolean).join(' ')}>{card.eyebrow}</p> : null}
      <Heading className={['font-semibold', titleClassName].filter(Boolean).join(' ')}>{card.title}</Heading>
      {card.description != null ? <p className={['agentic-dashboard-description', descriptionClassName].filter(Boolean).join(' ')}>{card.description}</p> : null}
      {card.content != null ? <div className="agentic-dashboard-detail">{card.content}</div> : null}
      {card.actions != null ? <div className="agentic-dashboard-actions">{card.actions}</div> : null}
    </li>)}
  </ol></section>
}
