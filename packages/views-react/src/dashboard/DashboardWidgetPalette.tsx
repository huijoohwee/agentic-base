import React from 'react'
import { DashboardWidgetFrame, type DashboardWidgetFrameProps } from './DashboardWidgetFrame'

export type DashboardWidgetPaletteTemplate = {
  id: string
  title: string
  kind: string
  preview: React.ReactNode
  toolbar?: DashboardWidgetFrameProps['toolbar']
  configuration?: DashboardWidgetFrameProps['configuration']
  className?: string
}

export type DashboardWidgetPaletteProps = {
  templates: readonly DashboardWidgetPaletteTemplate[]
  itemClassName?: string
}

/** Shared palette list and selection frame; template previews and editor actions stay host supplied. */
export function DashboardWidgetPalette({ templates, itemClassName = 'min-w-0' }: DashboardWidgetPaletteProps) {
  return <>
    {templates.map(({ id, title, kind, preview, toolbar, configuration, className = '' }) => <li key={id}
      aria-label={`Template ${title}`} className={[itemClassName, className].filter(Boolean).join(' ')}>
      <DashboardWidgetFrame id={`template-${id}`} template={kind} title={title} toolbar={toolbar} configuration={configuration}>
        {preview}
      </DashboardWidgetFrame>
    </li>)}
  </>
}
