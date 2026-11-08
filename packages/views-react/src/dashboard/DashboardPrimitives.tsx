import React from 'react'
import '../browser/shared-ui-profile.css'

/** React adapter for the Design System's native dashboard attributes. */
type Content = { children: React.ReactNode }
type Props = ({ kind: 'heading'; level?: 1 | 2 | 3 | 4 } & Content)
  | ({ kind: 'text' } & Content) | { kind: 'divider' }
  | ({ kind: 'container'; columns: 2 | 3 | 4 } & Content)

export function DashboardPrimitive(props: Props) {
  switch (props.kind) {
    case 'heading': {
      const Heading = (['h1', 'h2', 'h3', 'h4'] as const)[(props.level ?? 2) - 1]
      return <Heading data-dashboard-primitive="heading">{props.children}</Heading>
    }
    case 'text': return <p data-dashboard-primitive="text">{props.children}</p>
    case 'divider': return <hr data-dashboard-primitive="divider" />
    case 'container': return <div className="agentic-dashboard-region"><div data-dashboard-primitive="container" data-columns={props.columns}>{props.children}</div></div>
  }
}
