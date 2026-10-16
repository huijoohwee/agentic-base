import React from 'react'
import './floatingPanelShell.css'

export type FloatingPanelShellProps = {
  rootClassName?: string
  rootStyle?: React.CSSProperties
  panelStyle?: React.CSSProperties
  ariaLabel?: string
  minimized?: boolean
  pinned?: boolean
  rowHeight?: string
  fieldLine?: string
  onPointerDownCapture?: React.PointerEventHandler<HTMLElement>
  onFocusCapture?: React.FocusEventHandler<HTMLElement>
  panelLayer?: string
  onHeaderPointerDown?: React.PointerEventHandler<HTMLElement>
  header: React.ReactNode
  children: React.ReactNode
}

/** Shared floating panel chrome; the consumer owns placement, drag policy, and view state. */
export const FloatingPanelShell = React.forwardRef<HTMLElement, FloatingPanelShellProps>(function FloatingPanelShell({
  rootClassName = '', rootStyle, panelStyle, ariaLabel = 'Floating panel', minimized = false,
  pinned = true, rowHeight, fieldLine, onHeaderPointerDown, onPointerDownCapture, onFocusCapture,
  panelLayer, header, children,
}, ref) {
  return <section className={['agentic-base-floating-panel-root', rootClassName].filter(Boolean).join(' ')} style={rootStyle}
    data-agentic-base-panel-layer={panelLayer} onPointerDownCapture={onPointerDownCapture} onFocusCapture={onFocusCapture}>
    <aside ref={ref} className="agentic-base-floating-panel" style={panelStyle}
      data-agentic-base-floating-panel="true" data-agentic-base-panel-minimized={minimized ? 'true' : undefined}
      data-agentic-base-row-height={rowHeight} data-agentic-base-field-line={fieldLine}>
      <section className={['agentic-base-floating-panel-inner', minimized ? '' : 'agentic-base-floating-panel-expanded'].filter(Boolean).join(' ')}
        aria-label={ariaLabel}>
        <header className={['agentic-base-floating-panel-header', !pinned ? 'agentic-base-floating-panel-draggable' : ''].filter(Boolean).join(' ')}
          onPointerDown={onHeaderPointerDown}>{header}</header>
        {children}
      </section>
    </aside>
  </section>
})
