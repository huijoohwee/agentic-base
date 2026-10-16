import React from 'react'
import type { InputHTMLAttributes, ButtonHTMLAttributes } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { useSettingsHost } from './SettingsHostContext'

const classes = (...values: Array<string | null | undefined>): string => values.filter(Boolean).join(' ')

export type SettingsRowProps = {
  icon: React.ReactNode
  label: string
  value?: string
  onClick?: () => void
}

export function SettingsRow(props: SettingsRowProps) {
  const { theme, classes: styles } = useSettingsHost()
  return <button type="button" className={classes(styles.menuRow, 'gap-3 px-3 py-2 rounded', theme.button.hoverBg)} onClick={props.onClick}>
    <span className={classes('w-5 h-5 shrink-0 flex items-center justify-center', theme.icon.color)}>{props.icon}</span>
    <span className={classes('min-w-0 text-sm', styles.textTruncate, theme.text.primary)}>{props.label}</span>
    <span className={classes(styles.settingsRowValue, 'ml-auto min-w-0 text-sm', styles.textTruncate, theme.text.secondary)}>{props.value || ''}</span>
    <ChevronRight className={classes('w-4 h-4 shrink-0', theme.icon.color)} aria-hidden="true" />
  </button>
}

export function LayoutChoice(props: { active: boolean; label: string; icon: React.ReactNode; onClick: () => void }) {
  const { theme, classes: styles } = useSettingsHost()
  return <button type="button" className={classes(
    styles.layoutChoice,
    'relative flex-1 rounded border px-3 py-2 flex flex-col items-center justify-center gap-1 overflow-hidden',
    props.active ? classes(theme.button.activeBorder, theme.button.activeBg) : theme.panel.border,
    theme.button.hoverBg,
  )} onClick={props.onClick}>
    {props.active ? <span className="absolute right-2 top-2"><Check className={classes(styles.compactGlyph, theme.button.activeText)} aria-hidden="true" /></span> : null}
    <span className={props.active ? theme.button.activeText : theme.text.secondary}>{props.icon}</span>
    <span className={classes('max-w-full text-sm font-medium', styles.textTruncate, props.active ? theme.button.activeText : theme.text.secondary)}>{props.label}</span>
  </button>
}

type ComfortableTextInputProps = InputHTMLAttributes<HTMLInputElement>
export const WorkspaceDataViewComfortableTextInput = React.forwardRef<HTMLInputElement, ComfortableTextInputProps>(
  function WorkspaceDataViewComfortableTextInput({ className, ...props }, ref) {
    const { theme, classes: styles, components } = useSettingsHost()
    return <components.PanelTextInput {...props} ref={ref} className={classes(
      styles.dataViewFieldInput, 'rounded border text-sm', theme.input.bg, theme.input.border, theme.input.text, className,
    )} />
  },
)

type SearchInputProps = InputHTMLAttributes<HTMLInputElement>
export const WorkspaceDataViewSearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  function WorkspaceDataViewSearchInput({ className, ...props }, ref) {
    const { theme, classes: styles, components } = useSettingsHost()
    return <components.PanelTextInput {...props} ref={ref} variant="transparent" className={classes(
      styles.dataViewFieldInput, 'min-w-0 flex-1 bg-transparent text-xs outline-none', theme.input.text, className,
    )} />
  },
)

export type SettingsFieldSelectProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'defaultValue' | 'onChange' | 'type'> & {
  value?: string | number
  defaultValue?: string | number
  onValueChange?: (value: string) => void
  required?: boolean
  density?: 'compact' | 'comfortable'
  variant?: 'filled' | 'transparent'
}
export const WorkspaceDataViewFieldSelect = React.forwardRef<HTMLButtonElement, SettingsFieldSelectProps>(
  function WorkspaceDataViewFieldSelect({ className, ...props }, ref) {
    const { components } = useSettingsHost()
    return <components.PanelSelect {...props} ref={ref} className={className || ''} />
  },
)

type CompactCheckboxProps = InputHTMLAttributes<HTMLInputElement>
export const WorkspaceDataViewCompactCheckbox = React.forwardRef<HTMLInputElement, CompactCheckboxProps>(
  function WorkspaceDataViewCompactCheckbox({ className, ...props }, ref) {
    const { classes: styles, components } = useSettingsHost()
    return <components.PanelCheckbox {...props} ref={ref} className={classes(styles.compactSelection, className)} />
  },
)

export { SettingsPanelShell } from './SettingsPanelShell'
export type { SettingsPanelShellProps } from './SettingsPanelShell'
export { FieldWorkbench, FieldWorkbenchSearch, FieldWorkbenchGroup, FieldWorkbenchItem } from './FieldWorkbench'
export type { FieldWorkbenchProps } from './FieldWorkbench'
export { SettingsSectionHeader } from './SettingsSectionHeader'
export type { SettingsSectionHeaderProps } from './SettingsSectionHeader'
