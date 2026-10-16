import React from 'react'
import { X } from 'lucide-react'

export type FloatingPanelCloseButtonProps = {
  label: string
  onClose: () => void
  disabled?: boolean
  className?: string
  icon?: React.ReactNode
}

/** Store-free close control; consumers may supply the host's icon and action classes. */
export function FloatingPanelCloseButton({ label, onClose, disabled = false, className = '', icon }: FloatingPanelCloseButtonProps) {
  return <button type="button" aria-label={label} title={label} disabled={disabled}
    className={['agentic-base-floating-panel-close', className].filter(Boolean).join(' ')}
    onClick={event => { event.preventDefault(); event.stopPropagation(); if (!disabled) onClose() }}>
    {icon ?? <X aria-hidden="true" size={16} />}
  </button>
}
