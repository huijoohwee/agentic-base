import React from 'react'
import { TableCore, type TableCoreColumn } from './TableCore'

export type DataTableRecord = { id: string; cells: readonly string[] }
export type DataTableField = { id: string; label: string }

/** Shared, literal-text table surface for bounded browser and offline consumers. */
export function DataTableCore(props: {
  fields: readonly DataTableField[]
  records: readonly DataTableRecord[]
  orientation: 'rows' | 'columns'
  selectedRowId?: string | null
  onActivateRow?: (rowId: string) => void
  ariaLabel: string
  emptyMessage?: string
  afterRows?: React.ReactNode
}) {
  const columns: TableCoreColumn[] = props.orientation === 'rows'
    ? props.fields.map(field => ({ id: field.id, width: 180 }))
    : [{ id: '__field', width: 168 }, ...props.records.map(record => ({ id: `record:${record.id}`, width: 180 }))]
  const tableRows = props.orientation === 'rows'
    ? props.records.map(record => ({ id: record.id, label: '', cells: record.cells }))
    : props.fields.map((field, index) => ({
      id: field.id,
      label: field.label,
      cells: props.records.map(record => record.cells[index] ?? ''),
    }))
  const activate = props.orientation === 'rows' ? props.onActivateRow : undefined
  return (
    <TableCore
      columns={columns}
      ariaLabel={props.ariaLabel}
      frameClassName="agentic-base-data-view"
      tableClassName="agentic-base-data-table"
      tableStyle={{ width: '100%', minWidth: columns.reduce((sum, column) => sum + column.width, 0) }}
      headerClassName="agentic-base-data-table-header"
      bodyClassName="agentic-base-data-table-body"
      header={(
        <tr>
          {props.orientation === 'columns' && <th scope="col">Field</th>}
          {props.orientation === 'rows'
            ? props.fields.map(field => <th key={field.id} scope="col">{field.label}</th>)
            : props.records.map(record => <th key={record.id} scope="col">{record.cells[0] || record.id}</th>)}
        </tr>
      )}
      rows={(
        <>
          {tableRows.map(row => (
            <tr
              key={row.id}
              className={activate ? 'agentic-base-data-row agentic-base-data-row-activatable' : 'agentic-base-data-row'}
              aria-selected={activate ? props.selectedRowId === row.id : undefined}
              tabIndex={activate ? 0 : undefined}
              onClick={activate ? event => {
                const target = event.target as HTMLElement | null
                if (!target?.closest('button,input,select,textarea,a')) activate(row.id)
              } : undefined}
              onKeyDown={activate ? event => {
                if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault()
                  activate(row.id)
                }
              } : undefined}
            >
              {props.orientation === 'columns' && <th scope="row">{row.label}</th>}
              {row.cells.map((cell, index) => <td key={`${row.id}:${index}`}><span>{cell}</span></td>)}
            </tr>
          ))}
          {!tableRows.length && <tr><td className="agentic-base-data-empty" colSpan={Math.max(1, columns.length)} role="status">{props.emptyMessage ?? 'No records.'}</td></tr>}
          {props.afterRows}
        </>
      )}
    />
  )
}
