import type { SharedIconName } from './dropdownMenu.js'

export function createDesignIcon(name: SharedIconName, ownerDocument?: Document): SVGSVGElement
export function getIconButtonProps(label: string): {
  type: 'button'
  className: string
  'data-icon-only': ''
  'aria-label': string
}
export function getIconSizeClass(scale?: string): string
export function createIconButton(label: string, glyph: SVGElement): HTMLButtonElement
export function hydrateDesignIcons(root?: ParentNode): number
