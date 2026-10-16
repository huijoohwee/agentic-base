import React from 'react'
import { useKanbanHost } from './KanbanHostContext'

export function KanbanNewRecordDividerRow(props: { onClick: () => void }) {
  const host = useKanbanHost()
  const NewRecordButton = host.components.NewRecordButton
  return (
    <li {...{ [host.markers.divider]: '1' }} className="list-none">
      <NewRecordButton onClick={props.onClick} presentation="divider" />
    </li>
  )
}
