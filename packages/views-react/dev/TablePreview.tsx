import React from 'react'
import { CardInlineTextEditor } from '@/lib/cards/CardInlineTextEditor'
import { MARKDOWN_TEXT_EDIT_SURFACE_MIN_LINE_HEIGHT_CLASS } from '@/features/markdown/ui/markdownEditSurfaceLayout'
import { TableHostProvider } from '../src/table/TableHostContext'
import { TableView, type TableViewProps } from '../src/table/TableView'
import { MultiDimTableView } from '../src/table/MultiDimTableView'
import { graphTableHost } from './GraphTableHost'

const PreviewInlineTextCellEditor = (props: {
  ariaLabel: string
  initialValue: string
  textClassName: string
  markdownCommandContextText?: string
  onCommit: (nextValue: string) => void
  onCancel: () => void
}) => {
  const className = ['inline-block w-full', MARKDOWN_TEXT_EDIT_SURFACE_MIN_LINE_HEIGHT_CLASS, 'whitespace-pre-wrap break-words outline-none', props.textClassName].join(' ')
  return <CardInlineTextEditor
    value={String(props.initialValue ?? '')}
    ariaLabel={props.ariaLabel}
    placeholder="—"
    canEdit
    editActivation="click"
    editRequestKey={`${props.ariaLabel}:${props.initialValue}`}
    multiline
    editorSurface="control"
    markdownPreview="auto"
    markdownCommandContextText={props.markdownCommandContextText}
    markdownCommandMenus={false}
    showCommandLaunchers={false}
    rows={2}
    displayClassName={className}
    editorClassName={className}
    onCommit={props.onCommit}
    onEditingChange={editing => { if (!editing) props.onCancel() }}
  />
}

const previewTableHost = {
  ...graphTableHost,
  components: {
    ...graphTableHost.components,
    InlineTextCellEditor: PreviewInlineTextCellEditor,
  },
}

export default function TablePreview(props: TableViewProps & { multiDimensional?: boolean }) {
  const [orientation, setOrientation] = React.useState<'rows' | 'columns'>('rows')
  const View = props.multiDimensional ? MultiDimTableView : TableView
  return <section aria-label="Shared Table preview">
    <h2 className="mb-3 text-lg font-semibold text-[color:var(--kg-text-primary)]">Shared {props.multiDimensional ? 'Multi-dimensional Table' : 'Table'} view</h2>
    <nav className="mb-3 flex gap-2" aria-label="Table orientation">
      <button type="button" aria-pressed={orientation === 'rows'} onClick={() => setOrientation('rows')}>Records as rows</button>
      <button type="button" aria-pressed={orientation === 'columns'} onClick={() => setOrientation('columns')}>Records as columns</button>
    </nav>
    <TableHostProvider value={previewTableHost}><View {...props} orientation={orientation} /></TableHostProvider>
  </section>
}
