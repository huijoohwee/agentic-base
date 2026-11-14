import React from 'react'
import type { FloatingPanelShellProps } from './floatingPanelContract'
import '../browser/shared-ui-profile.css'
import './floatingPanelShell.css'

export type { FloatingPanelShellProps } from './floatingPanelContract'

/** Shared floating panel chrome; the consumer owns placement, drag policy, and view state. */
export const FloatingPanelShell = React.forwardRef<HTMLElement, FloatingPanelShellProps>(function FloatingPanelShell({
  rootPlacement = 'flow', rootStyle, panelStyle, ariaLabel = 'Floating panel', minimized = false,
  pinned = true, rowHeight, fieldLine, onHeaderPointerDown, onPointerDownCapture, onFocusCapture,
  panelLayer, header, children,
}, ref) {
  return <section className="agentic-base-floating-panel-root" style={rootStyle}
    data-agentic-floating-panel-placement={rootPlacement === 'flow' ? undefined : rootPlacement}
    data-agentic-base-panel-layer={panelLayer} onPointerDownCapture={onPointerDownCapture} onFocusCapture={onFocusCapture}>
    <aside ref={ref} className="agentic-base-floating-panel agentic-form-controls" style={panelStyle}
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
