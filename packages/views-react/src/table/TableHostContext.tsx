import React from 'react'
import type { ComponentType, ReactNode } from 'react'
import type { ViewRow } from '../kanban/KanbanHostContext'

export type DataViewRowHeightPreset = 'compact' | 'comfortable'
export type DataViewFieldLineMode = 'single' | 'double' | 'flex'

type TableHostComponent = ComponentType<any>

export type TableHostAdapter = {
  contract: 'agentic-base/table-host/v1'
  themeTokens: Record<string, any>
  copy: any
  styles: Record<string, string>
  icons: Record<string, Record<string, TableHostComponent>>
  components: Record<string, TableHostComponent>
  stores: {
    tablePreferences: {
      subscribe: (listener: () => void) => () => void
      getSnapshot: () => { workspaceCellSelectPanelPlacement: string }
      getServerSnapshot: () => { workspaceCellSelectPanelPlacement: string }
    }
  }
  data: Record<string, any>
  helpers: Record<string, any>
}

const TableHostContext = React.createContext<TableHostAdapter | null>(null)
export const TableHostProvider = TableHostContext.Provider

export function useTableHost(): TableHostAdapter {
  const host = React.useContext(TableHostContext)
  if (!host || host.contract !== 'agentic-base/table-host/v1') {
    throw new Error('Table view requires an agentic-base/table-host/v1 adapter')
  }
  return host
}

export type TableViewRenderResult = ReactNode
export type TableRow = ViewRow
