import React from 'react'
import './dashboardWidgetFrame.css'
import { useDashboardWidgetResize, type DashboardWidgetResizeOptions } from './useDashboardWidgetResize'

export type DashboardWidgetFrameToolbarState = {
  visible: boolean
  flipped: boolean
  onFlip: () => void
}
export type DashboardWidgetFrameProps = {
  id: string
  template: string
  title: string
  children: React.ReactNode
  widgetId?: string
  expanded?: boolean
  onRequestExpand?: () => void
  toolbar?: (state: DashboardWidgetFrameToolbarState) => React.ReactNode
  configuration?: (args: { onClose: () => void }) => React.ReactNode
  resize?: DashboardWidgetResizeOptions
  sizeStyle?: React.CSSProperties
  resizeHandle?: React.ReactNode
  toolbarStyle?: React.CSSProperties
  interactiveSelector?: string
  className?: string
  selectedClassName?: string
}

const DEFAULT_INTERACTIVE = 'button,input,textarea,select,a,summary,[contenteditable="true"],[role="button"],[role="textbox"]'

/** Shared selectable/flip frame; toolbars, settings, sizing, and persistence are host supplied. */
export function DashboardWidgetFrame({
  id, template, title, children, widgetId, expanded = true, onRequestExpand, toolbar, configuration,
  resize, sizeStyle, resizeHandle, toolbarStyle, interactiveSelector = '', className = '', selectedClassName = '',
}: DashboardWidgetFrameProps) {
  const [flipped, setFlipped] = React.useState(false)
  const [turned, setTurned] = React.useState(false)
  const [toolbarVisible, setToolbarVisible] = React.useState(false)
  const [frontSize, setFrontSize] = React.useState<{ width: number; height: number } | null>(null)
  const frame = React.useRef<HTMLElement>(null)
  const resizeControl = useDashboardWidgetResize(frame, resize)
  const sized = !!widgetId || resizeControl.aspect === 'custom' && !!resize
  const frameSizeStyle = resizeControl.style ?? sizeStyle
  const frameResizeHandle = resizeHandle !== undefined ? resizeHandle : resizeControl.handle
  const dragged = React.useRef(false)
  const keyboardSelection = React.useRef(false)

  React.useEffect(() => {
    if (!toolbarVisible) return
    const onPointerDown = (event: PointerEvent) => {
      if (!frame.current?.contains(event.target as Node)) setToolbarVisible(false)
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !flipped) setToolbarVisible(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onEscape)
    }
  }, [toolbarVisible, flipped])

  React.useEffect(() => {
    if (!toolbarVisible || !keyboardSelection.current) return
    frame.current?.querySelector<HTMLButtonElement>('[data-agentic-base-dashboard-action="flip"]')?.focus({ preventScroll: true })
    keyboardSelection.current = false
  }, [toolbarVisible])

  const close = () => { setFlipped(false); frame.current?.focus({ preventScroll: true }) }
  const flip = () => {
    if (flipped) { close(); return }
    const rect = frame.current?.getBoundingClientRect()
    if (rect && rect.width > 0 && rect.height > 0) setFrontSize({ width: rect.width, height: rect.height })
    setToolbarVisible(false)
    setTurned(true)
    setFlipped(true)
  }
  const isInteractive = (target: EventTarget) => target instanceof Element &&
    !!target.closest([DEFAULT_INTERACTIVE, interactiveSelector].filter(Boolean).join(','))
  const toolbarNode = toolbar?.({ visible: toolbarVisible, flipped, onFlip: flip })

  return <article ref={frame} className={[
    'agentic-base-dashboard-widget relative min-w-0', sized ? 'agentic-base-dashboard-widget-sized' : 'h-full',
    className, selectedClassName,
  ].filter(Boolean).join(' ')} tabIndex={flipped ? -1 : 0} role="group"
    style={flipped && frontSize ? { width: frontSize.width, height: frontSize.height, maxWidth: '100%' } : expanded ? frameSizeStyle : { width: frameSizeStyle?.width, maxWidth: '100%' }}
    data-agentic-base-dashboard-widget={widgetId ?? `template:${template}`}
    data-agentic-base-dashboard-widget-sized={sized ? 'true' : undefined}
    data-agentic-base-dashboard-selected={toolbarVisible ? 'true' : 'false'}
    aria-label={`Configure ${title}`} aria-expanded={flipped}
    onPointerDownCapture={() => { dragged.current = false }}
    onDragStartCapture={() => { dragged.current = true; setToolbarVisible(false) }}
    onClickCapture={event => {
      if (flipped || dragged.current || isInteractive(event.target)) return
      event.preventDefault(); event.stopPropagation(); setToolbarVisible(true)
    }}
    onKeyDown={event => {
      if (event.defaultPrevented || flipped) return
      if (event.key === 'Escape' && toolbarVisible) { event.preventDefault(); setToolbarVisible(false); frame.current?.focus({ preventScroll: true }); return }
      if (isInteractive(event.target)) return
      if ((event.key === 'Enter' || event.key === ' ') && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        event.preventDefault(); event.stopPropagation(); keyboardSelection.current = true; setToolbarVisible(true)
      }
    }}>
    {toolbarNode ? <div data-agentic-base-dashboard-toolbar="true" style={toolbarStyle}>{toolbarNode}</div> : null}
    {!flipped && !expanded && template !== 'disclosure' ? <button type="button" className="agentic-base-dashboard-widget-collapsed" aria-expanded={false} onClick={onRequestExpand}>▸ {title}</button> : null}
    <section hidden={!flipped && !expanded && template !== 'disclosure'} key={flipped ? 'back' : 'front'}
      data-agentic-base-dashboard-face={flipped ? 'back' : 'front'} className={['agentic-base-dashboard-widget-face h-full', turned ? 'agentic-base-dashboard-widget-turn' : ''].join(' ')}>
      {flipped ? configuration?.({ onClose: close }) : children}
    </section>
    {frameResizeHandle}
  </article>
}
