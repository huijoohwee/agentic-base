import React from 'react'
import type { PanelControlName } from './dropdownMenu.js'
import { updatePanelControlGroup } from './toolbar-icons.js'

export type PanelControlActions = Partial<Record<PanelControlName, () => void>>
export type PanelControlDisabledState = Partial<Record<PanelControlName, boolean>>

export interface PanelControlGroupProps {
  actions: PanelControlActions
  disabled?: PanelControlDisabledState
  minimized?: boolean
  pinned?: boolean
}

/** Thin React bridge; order, visibility, markup, and interaction come from Design System. */
export function PanelControlGroup({ actions, disabled = {}, minimized = false, pinned = false }: PanelControlGroupProps) {
  const groupRef = React.useRef<HTMLElement | null>(null)
  React.useLayoutEffect(() => {
    if (groupRef.current) updatePanelControlGroup(groupRef.current, { actions, disabled, minimized, pinned })
  }, [actions, disabled, minimized, pinned])
  return <section ref={groupRef} role="group" aria-label="Panel controls" className="agentic-panel-control-group" />
}
