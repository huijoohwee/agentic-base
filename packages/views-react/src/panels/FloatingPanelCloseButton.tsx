import React from 'react'
import { X } from 'lucide-react'
import type { FloatingPanelCloseButtonProps } from './floatingPanelContract'

export type { FloatingPanelCloseButtonProps } from './floatingPanelContract'

/** Store-free close control with its icon size and stroke owned by the shared design profile. */
export function FloatingPanelCloseButton({ label, onClose, disabled = false }: FloatingPanelCloseButtonProps) {
  return <button type="button" aria-label={label} title={label} disabled={disabled}
    className="agentic-base-floating-panel-close"
    onClick={event => { event.preventDefault(); event.stopPropagation(); if (!disabled) onClose() }}>
    <X aria-hidden="true" className="agentic-icon" />
  </button>
}
