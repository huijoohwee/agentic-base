import React from 'react'
import { DashboardWidgetResizeHandle } from './DashboardWidgetResizeHandle'

export type DashboardWidgetSize = { width: number; height: number }
export type DashboardWidgetResizeOptions = {
  enabled?: boolean
  aspectRatio?: '16:9' | '9:16' | 'custom'
  width?: number
  height?: number
  snapGrid?: { x: number; y?: number }
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  onResize: (size: DashboardWidgetSize) => void
}

const finite = (value: number | undefined, fallback: number) => Number.isFinite(value) ? value as number : fallback

/** Reusable pointer and keyboard sizing; persistence and layout policy remain with the caller. */
export function useDashboardWidgetResize(frame: React.RefObject<HTMLElement>, options?: DashboardWidgetResizeOptions) {
  const [draft, setDraft] = React.useState<DashboardWidgetSize | null>(null)
  const pointer = React.useRef<{ id: number; x: number; y: number; size: DashboardWidgetSize } | null>(null)
  const aspect = options?.aspectRatio ?? '16:9'
  const snap = options?.snapGrid
  const minWidth = Math.max(1, finite(options?.minWidth, 120))
  const minHeight = Math.max(1, finite(options?.minHeight, 120))
  const maxWidth = Math.max(minWidth, finite(options?.maxWidth, 4096))
  const maxHeight = Math.max(minHeight, finite(options?.maxHeight, 4096))

  const constrain = (size: DashboardWidgetSize): DashboardWidgetSize => {
    const snappedWidth = snap && snap.x > 0 ? Math.round(size.width / snap.x) * snap.x : size.width
    const yStep = snap?.y ?? snap?.x
    const snappedHeight = yStep && yStep > 0 ? Math.round(size.height / yStep) * yStep : size.height
    return { width: Math.max(minWidth, Math.min(maxWidth, snappedWidth)), height: Math.max(minHeight, Math.min(maxHeight, snappedHeight)) }
  }
  const currentSize = (): DashboardWidgetSize => {
    const rect = frame.current?.getBoundingClientRect()
    return { width: finite(draft?.width, finite(options?.width, rect?.width || 360)),
      height: finite(draft?.height, finite(options?.height, rect?.height || 203)) }
  }
  const commit = (size: DashboardWidgetSize) => options?.onResize(constrain(size))
  const onPointerDown: React.PointerEventHandler<HTMLButtonElement> = event => {
    if (event.button !== 0 || !options?.enabled || aspect !== 'custom') return
    const size = currentSize()
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, size }
    event.preventDefault(); event.stopPropagation()
    try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* Window-level movement is not needed when capture is unavailable. */ }
  }
  const onPointerMove: React.PointerEventHandler<HTMLButtonElement> = event => {
    const start = pointer.current
    if (!start || start.id !== event.pointerId) return
    event.preventDefault(); event.stopPropagation()
    setDraft(constrain({ width: start.size.width + event.clientX - start.x, height: start.size.height + event.clientY - start.y }))
  }
  const finishPointer: React.PointerEventHandler<HTMLButtonElement> = event => {
    const start = pointer.current
    if (!start || start.id !== event.pointerId) return
    event.preventDefault(); event.stopPropagation()
    const next = constrain({ width: start.size.width + event.clientX - start.x, height: start.size.height + event.clientY - start.y })
    pointer.current = null; setDraft(null); commit(next)
  }
  const cancelPointer: React.PointerEventHandler<HTMLButtonElement> = event => {
    if (!pointer.current || pointer.current.id !== event.pointerId) return
    event.stopPropagation(); pointer.current = null; setDraft(null)
  }
  const onKeyDown: React.KeyboardEventHandler<HTMLButtonElement> = event => {
    if (!options?.enabled || aspect !== 'custom') return
    const delta = { width: 0, height: 0 }
    const fallback = event.shiftKey ? 20 : 10
    const xStep = snap?.x && snap.x > 0 ? snap.x : fallback
    const yValue = snap?.y ?? snap?.x
    const yStep = yValue && yValue > 0 ? yValue : fallback
    if (event.key === 'ArrowRight') delta.width = xStep
    else if (event.key === 'ArrowLeft') delta.width = -xStep
    else if (event.key === 'ArrowDown') delta.height = yStep
    else if (event.key === 'ArrowUp') delta.height = -yStep
    else return
    event.preventDefault(); event.stopPropagation()
    const current = currentSize()
    commit({ width: current.width + delta.width, height: current.height + delta.height })
  }

  const style: React.CSSProperties | undefined = !options ? undefined : aspect === 'custom'
    ? { width: draft?.width ?? finite(options?.width, 360), height: draft?.height ?? finite(options?.height, 203), maxWidth: '100%' }
    : { width: '100%', aspectRatio: aspect === '9:16' ? '9 / 16' : '16 / 9', height: 'auto', minHeight: minHeight }
  const handle = options?.enabled && aspect === 'custom'
    ? <DashboardWidgetResizeHandle label="Resize dashboard widget" onPointerDown={onPointerDown} onKeyDown={onKeyDown}
        onPointerMove={onPointerMove} onPointerUp={finishPointer} onPointerCancel={cancelPointer} />
    : null
  return { style, handle, aspect }
}
