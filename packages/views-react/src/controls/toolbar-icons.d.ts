import type { PanelControlName, SharedIconName } from './dropdownMenu.js'

export interface PanelControlGroupRuntimeOptions {
  actions?: Partial<Record<PanelControlName, () => void>>
  disabled?: Partial<Record<PanelControlName, boolean>>
  minimized?: boolean
  pinned?: boolean
}

export interface PanelControlButtonRuntimeOptions {
  action?: () => void
  disabled?: boolean
  pressed?: boolean
}

export function createDesignIcon(name: SharedIconName, ownerDocument?: Document): SVGSVGElement
export function createPanelControlIcon(control: PanelControlName, ownerDocument?: Document): SVGSVGElement
export function getPanelControlLabel(control: PanelControlName): string
export function getIconButtonProps(label: string): {
  type: 'button'
  className: string
  'data-icon-only': ''
  'aria-label': string
}
export function getIconSizeClass(scale?: string): string
export function createIconButton(label: string, glyph: SVGElement): HTMLButtonElement
export function hydrateDesignIcons(root?: ParentNode): number
export function applyPanelControl(button: HTMLButtonElement, control: PanelControlName): HTMLButtonElement
export function createPanelControlButton(control: PanelControlName, ownerDocument?: Document): HTMLButtonElement
export function hydratePanelControls(root?: ParentNode): number
export function resolvePanelControlRoles(options?: PanelControlGroupRuntimeOptions): PanelControlName[]

export function updatePanelControlButton(
  button: HTMLButtonElement,
  control: PanelControlName,
  options?: PanelControlButtonRuntimeOptions,
): HTMLButtonElement

export function updatePanelControlGroup(
  group: HTMLElement,
  options: PanelControlGroupRuntimeOptions,
): HTMLElement
