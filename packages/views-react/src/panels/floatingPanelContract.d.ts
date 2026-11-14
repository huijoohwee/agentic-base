import type * as React from 'react'

export type FloatingPanelRootPlacement = 'flow' | 'dock' | 'viewport-overlay'

/** Geometry only; visual properties stay owned by the central FloatingPanel stylesheet. */
export type FloatingPanelPanelStyle = Pick<React.CSSProperties,
  | 'position' | 'inset' | 'insetBlock' | 'insetInline' | 'insetBlockStart' | 'insetInlineEnd'
  | 'top' | 'right' | 'bottom' | 'left' | 'width' | 'height' | 'minWidth' | 'minHeight'
  | 'maxWidth' | 'maxHeight' | 'zIndex'
>

/** The shell accepts placement and geometry only; visuals come from the shared profile. */
export type FloatingPanelRootStyle = FloatingPanelPanelStyle

export interface FloatingPanelShellProps {
  rootPlacement?: FloatingPanelRootPlacement
  rootStyle?: FloatingPanelRootStyle
  panelStyle?: FloatingPanelPanelStyle
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

export interface FloatingPanelCloseButtonProps {
  onClose: () => void
  disabled?: boolean
}

export interface FloatingPanelTabsProps extends Omit<React.HTMLAttributes<HTMLElement>,
  'aria-label' | 'aria-orientation' | 'className' | 'children' | 'onKeyDown' | 'role' | 'style'> {
  label: string
  activeKey: string
  onSelect: (tabKey: string) => void
  children: React.ReactNode
}

export interface FloatingPanelTabProps {
  tabKey: string
  label: string
  id?: string
  ariaControls?: string
  disabled?: boolean
  iconOnly?: boolean
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  dataAttributes?: Readonly<Record<`data-${string}`, string>>
}
