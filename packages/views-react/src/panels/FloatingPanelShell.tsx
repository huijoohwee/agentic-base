import React from 'react'
import type { FloatingPanelShellProps } from './floatingPanelContract'
import '../browser/shared-ui-profile.css'
import './floatingPanelShell.css'

export type { FloatingPanelShellProps } from './floatingPanelContract'

/** Shared floating panel chrome; the consumer owns placement, drag policy, and view state. */
export const FloatingPanelShell = React.forwardRef<HTMLElement, FloatingPanelShellProps>(function FloatingPanelShell({
  rootPlacement = 'flow', rootStyle, panelStyle, ariaLabel = 'Floating panel', minimized = false,
  avoidBottomPanel = false,
  pinned = true, rowHeight, fieldLine, onHeaderPointerDown, onPointerDownCapture, onFocusCapture,
  panelLayer, header, children,
}, ref) {
  const rootRef = React.useRef<HTMLElement | null>(null)
  React.useEffect(() => {
    if (!avoidBottomPanel || rootPlacement !== 'viewport-overlay') return
    const root = rootRef.current
    const surface = root?.querySelector<HTMLElement>('.agentic-base-floating-panel')
    const ownerDocument = root?.ownerDocument
    const ownerWindow = ownerDocument?.defaultView
    if (!root || !surface || !ownerDocument || !ownerWindow) return

    let bottomPanel: HTMLElement | null = null
    let resizeObserver: ResizeObserver | null = null
    const update = () => {
      const rect = bottomPanel?.getBoundingClientRect()
      const floatingTop = surface.getBoundingClientRect().top
      if (!rect || rect.width <= 0 || rect.height <= 0 || rect.top <= floatingTop || rect.top >= ownerWindow.innerHeight) {
        root.style.removeProperty('--agentic-floating-panel-available-height')
        return
      }
      root.style.setProperty('--agentic-floating-panel-available-height', `${Math.floor(rect.top - floatingTop)}px`)
    }
    const findBottomPanel = () => {
      const next = ownerDocument.querySelector<HTMLElement>('[data-agentic-panel-kind="bottom"]')
      if (next === bottomPanel) return
      resizeObserver?.disconnect()
      bottomPanel = next
      if (bottomPanel && typeof ownerWindow.ResizeObserver !== 'undefined') {
        resizeObserver = new ownerWindow.ResizeObserver(update)
        resizeObserver.observe(bottomPanel)
      }
      update()
    }
    const mutations = new ownerWindow.MutationObserver(findBottomPanel)
    mutations.observe(ownerDocument.documentElement, { childList: true, subtree: true })
    ownerWindow.addEventListener('resize', update, { passive: true })
    findBottomPanel()
    return () => {
      mutations.disconnect()
      resizeObserver?.disconnect()
      ownerWindow.removeEventListener('resize', update)
      root.style.removeProperty('--agentic-floating-panel-available-height')
    }
  }, [avoidBottomPanel, rootPlacement])

  return <section className="agentic-base-floating-panel-root" style={rootStyle}
    ref={rootRef}
    data-agentic-floating-panel-placement={rootPlacement === 'flow' ? undefined : rootPlacement}
    data-agentic-floating-panel-avoid-bottom={avoidBottomPanel ? 'true' : undefined}
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
