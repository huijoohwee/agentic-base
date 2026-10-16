import React from 'react'
import type { ComponentType } from 'react'

export type SettingsHostAdapter = {
  contract: 'agentic-base/settings-host/v1'
  theme: {
    button: { hoverBg: string; activeBorder: string; activeBg: string; activeText: string }
    icon: { color: string }
    input: { bg: string; border: string; text: string }
    panel: { border: string }
    text: { primary: string; secondary: string }
  }
  classes: {
    compactGlyph: string
    compactSelection: string
    dataViewFieldInput: string
    layoutChoice: string
    menuRow: string
    settingsRowValue: string
    textTruncate: string
  }
  components: {
    PanelTextInput: ComponentType<any>
    PanelSelect: ComponentType<any>
    PanelCheckbox: ComponentType<any>
  }
}

const SettingsHostContext = React.createContext<SettingsHostAdapter | null>(null)
export const SettingsHostProvider = SettingsHostContext.Provider

export function useSettingsHost(): SettingsHostAdapter {
  const host = React.useContext(SettingsHostContext)
  if (!host || host.contract !== 'agentic-base/settings-host/v1') {
    throw new Error('Settings primitives require an agentic-base/settings-host/v1 adapter')
  }
  return host
}
