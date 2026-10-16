import type { SettingsHostAdapter } from '../src/settings/SettingsHostContext'
import { UI_THEME_TOKENS } from '@/lib/ui/theme-tokens'
import { PanelCheckbox, PanelSelect, PanelTextInput } from '@/lib/ui/panelFormControls'
import { UI_TEXT_TRUNCATE } from '@/lib/ui/textLayout'
import {
  UI_RESPONSIVE_COMPACT_GLYPH_CLASSNAME,
  UI_RESPONSIVE_COMPACT_SELECTION_CONTROL_CLASSNAME,
  UI_RESPONSIVE_DATA_VIEW_FIELD_INPUT_CLASSNAME,
  UI_RESPONSIVE_DATA_VIEW_SETTINGS_LAYOUT_CHOICE_CLASSNAME,
  UI_RESPONSIVE_DATA_VIEW_SETTINGS_ROW_VALUE_CLASSNAME,
  UI_RESPONSIVE_MENU_ROW_CLASSNAME,
} from '@/lib/ui/responsiveElementClasses'

export const graphSettingsHost: SettingsHostAdapter = {
  contract: 'agentic-base/settings-host/v1',
  theme: {
    button: {
      hoverBg: UI_THEME_TOKENS.button.hoverBg,
      activeBorder: UI_THEME_TOKENS.button.activeBorder,
      activeBg: UI_THEME_TOKENS.button.activeBg,
      activeText: UI_THEME_TOKENS.button.activeText,
    },
    icon: { color: UI_THEME_TOKENS.icon.color },
    input: {
      bg: UI_THEME_TOKENS.input.bg,
      border: UI_THEME_TOKENS.input.border,
      text: UI_THEME_TOKENS.input.text,
    },
    panel: { border: UI_THEME_TOKENS.panel.border },
    text: { primary: UI_THEME_TOKENS.text.primary, secondary: UI_THEME_TOKENS.text.secondary },
  },
  classes: {
    compactGlyph: UI_RESPONSIVE_COMPACT_GLYPH_CLASSNAME,
    compactSelection: UI_RESPONSIVE_COMPACT_SELECTION_CONTROL_CLASSNAME,
    dataViewFieldInput: UI_RESPONSIVE_DATA_VIEW_FIELD_INPUT_CLASSNAME,
    layoutChoice: UI_RESPONSIVE_DATA_VIEW_SETTINGS_LAYOUT_CHOICE_CLASSNAME,
    menuRow: UI_RESPONSIVE_MENU_ROW_CLASSNAME,
    settingsRowValue: UI_RESPONSIVE_DATA_VIEW_SETTINGS_ROW_VALUE_CLASSNAME,
    textTruncate: UI_TEXT_TRUNCATE,
  },
  components: { PanelTextInput, PanelSelect, PanelCheckbox },
}
