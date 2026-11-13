import { PanelControlButton } from '../controls'
import type { FloatingPanelCloseButtonProps } from './floatingPanelContract'

export type { FloatingPanelCloseButtonProps } from './floatingPanelContract'

/** Store-free close control with its icon size and stroke owned by the shared design profile. */
export function FloatingPanelCloseButton({ onClose, disabled = false }: FloatingPanelCloseButtonProps) {
  return <PanelControlButton control="close" onAction={onClose} disabled={disabled} />
}
