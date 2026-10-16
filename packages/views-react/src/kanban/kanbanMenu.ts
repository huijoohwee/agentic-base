import React from 'react'

export const isInteractiveEventTarget = (target: EventTarget | null, hostSelector = ''): boolean => {
  if (!(target instanceof Element)) return false
  const selectors = [
    'button,select,input,textarea,a,[contenteditable="true"],[role="menu"],[role="menuitem"]',
    hostSelector,
  ].filter(Boolean).join(',')
  return !!target.closest(selectors)
}

export const useDismissableMenu = (args: {
  open: boolean
  onClose: () => void
  rootRef: React.RefObject<HTMLElement>
  triggerRef: React.RefObject<HTMLElement>
}) => {
  React.useEffect(() => {
    if (!args.open) return
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (args.rootRef.current?.contains(target)) return
      if (args.triggerRef.current?.contains(target)) return
      args.onClose()
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      args.onClose()
      args.triggerRef.current?.focus()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onEscape)
    }
  }, [args])
}
