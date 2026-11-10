import type * as React from 'react'

export type FloatingPanelRootPlacement = 'flow' | 'dock' | 'viewport-overlay'

/** Geometry only; visual properties stay owned by the central FloatingPanel stylesheet. */
export type FloatingPanelPanelStyle = Pick<React.CSSProperties,
  | 'position' | 'inset' | 'insetBlock' | 'insetInline' | 'insetBlockStart' | 'insetInlineEnd'
  | 'top' | 'right' | 'bottom' | 'left' | 'width' | 'height' | 'minWidth' | 'minHeight'
  | 'maxWidth' | 'maxHeight' | 'zIndex'
>

/** The shell accepts only placement plus the named host-token bridge variables. */
export type FloatingPanelRootStyle = FloatingPanelPanelStyle & Partial<Record<
  | '--base-accent' | '--base-text-primary' | '--base-text-secondary' | '--base-border'
  | '--base-panel' | '--base-shadow-overlay' | '--base-toolbar-compact-padding', string
>>

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
  label: string
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
