import React from 'react'

type GroupProps = Pick<React.HTMLAttributes<HTMLElement>, 'children' | 'id' | 'title'> & { 'aria-label': string }

export function ToggleButtonGroup(props: GroupProps) {
  return <section {...props} role="group" className="agentic-toggle-group" />
}

type ToggleProps = Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children' | 'disabled' | 'onClick' | 'title'> & {
  pressed: boolean
}

export function ToggleButton({ pressed, ...props }: ToggleProps) {
  return <button {...props} type="button" aria-pressed={pressed} />
}
