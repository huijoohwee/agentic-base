import React from 'react'

export type DashboardWidgetResizeHandleProps = {
  label: string
  disabled?: boolean
  onPointerDown: React.PointerEventHandler<HTMLButtonElement>
  onPointerMove?: React.PointerEventHandler<HTMLButtonElement>
  onPointerUp?: React.PointerEventHandler<HTMLButtonElement>
  onPointerCancel?: React.PointerEventHandler<HTMLButtonElement>
  onKeyDown: React.KeyboardEventHandler<HTMLButtonElement>
}

/** Neutral, keyboard-operable corner handle for a resizable dashboard widget. */
export function DashboardWidgetResizeHandle({ label, disabled = false, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onKeyDown }: DashboardWidgetResizeHandleProps) {
  return <button type="button" aria-label={label} aria-disabled={disabled || undefined} disabled={disabled}
    data-agentic-base-dashboard-resize-handle="true" onPointerDown={onPointerDown} onPointerMove={onPointerMove}
    onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onKeyDown={onKeyDown}
    style={{ position: 'absolute', right: 0, bottom: 0, zIndex: 20, width: 22, height: 22, padding: 0,
      border: 0, background: 'transparent', cursor: disabled ? 'default' : 'nwse-resize', touchAction: 'none' }}>
    <span aria-hidden="true" style={{ position: 'absolute', right: 5, bottom: 5, width: 9, height: 9,
      borderRight: '1px solid var(--agentic-base-text-tertiary, rgba(100, 116, 139, 0.6))',
      borderBottom: '1px solid var(--agentic-base-text-tertiary, rgba(100, 116, 139, 0.6))', opacity: 0.72 }} />
  </button>
}
