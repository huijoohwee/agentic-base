import React from 'react'

type GroupProps = Pick<React.FieldsetHTMLAttributes<HTMLFieldSetElement>, 'children' | 'id' | 'title' | 'aria-label'>

export function CheckboxGroup(props: GroupProps) {
  return <fieldset {...props} className="agentic-checkbox-group" />
}

export type CheckboxOptionProps = Pick<React.InputHTMLAttributes<HTMLInputElement>, 'checked' | 'disabled' | 'onChange' | 'aria-label'> & {
  label: React.ReactNode
  title?: string
  icon?: React.ReactNode
  labelProps?: React.LabelHTMLAttributes<HTMLLabelElement> & Record<`data-${string}`, string | undefined>
  inputComponent?: 'input' | React.ComponentType<React.InputHTMLAttributes<HTMLInputElement>>
}

export function CheckboxOption({ label, title, icon, labelProps, inputComponent: Input = 'input', ...props }: CheckboxOptionProps) {
  return (
    <label {...labelProps} title={title}>
      <Input {...props} type="checkbox" />
      {icon}
      <span>{label}</span>
    </label>
  )
}
