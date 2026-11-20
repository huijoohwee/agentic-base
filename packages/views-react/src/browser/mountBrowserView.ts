import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'

const mountedTargets = new WeakSet<HTMLElement>()

export function mountBrowserView<T>(target: HTMLElement, initial: T, snapshot: (value: T) => T, render: (value: T) => ReactNode) {
  const first = snapshot(initial)
  const ElementClass = target?.ownerDocument?.defaultView?.HTMLElement
  if (!ElementClass || !(target instanceof ElementClass)) throw new TypeError('Data view target must be an HTML element.')
  if (mountedTargets.has(target)) throw new Error('Data view target is already mounted.')
  const root = createRoot(target)
  mountedTargets.add(target)
  let destroyed = false
  root.render(render(first))
  return {
    update(next: T) {
      if (destroyed) throw new Error('Data view is destroyed.')
      root.render(render(snapshot(next)))
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      root.unmount()
      mountedTargets.delete(target)
    },
  }
}
