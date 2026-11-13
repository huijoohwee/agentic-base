import React from 'react'
import type { PanelControlName } from './dropdownMenu.js'
import { updatePanelControlButton } from './toolbar-icons.js'

type PanelControlButtonState =
  | { control: 'pin'; pressed?: boolean }
  | { control: Exclude<PanelControlName, 'pin'>; pressed?: never }

export type PanelControlButtonProps = PanelControlButtonState & {
  onAction: () => void
  disabled?: boolean
}

/** React host bridge; Design System owns button markup, semantics, icon, and interaction. */
export function PanelControlButton({ control, onAction, disabled = false, pressed }: PanelControlButtonProps) {
  const buttonRef = React.useRef<HTMLButtonElement | null>(null)
  React.useLayoutEffect(() => {
    if (buttonRef.current) updatePanelControlButton(buttonRef.current, control, { action: onAction, disabled, pressed })
  }, [control, onAction, disabled, pressed])
  return <button ref={buttonRef} />
}
