import React from 'react'
import { CardInlineTextEditor } from '@/lib/cards/CardInlineTextEditor'
import { MARKDOWN_TEXT_EDIT_SURFACE_MIN_LINE_HEIGHT_CLASS } from '@/features/markdown/ui/markdownEditSurfaceLayout'
import { TableHostProvider } from '../src/table/TableHostContext'
import { TableView, type TableViewProps } from '../src/table/TableView'
import { createBaseTableHost, MultiDimTableView } from '../src/table/MultiDimTableView'
import { graphTableHost } from './GraphTableHost'
import { WorkspaceModeSelect } from '@/features/markdown-workspace/WorkspaceModeSelect'
import { WorkspaceDataViewHeader, type WorkspaceDataViewHeaderState } from '@/features/markdown-workspace/main/viewer/WorkspaceDataViewHeader'
import type { WorkspaceDataViewConfig } from '@/features/markdown-workspace/main/viewer/workspaceDataViewConfig'
import '../src/browser/browserDataView.css'

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
const baseTableHost = createBaseTableHost({
  components: { InlineTextCellEditor: PreviewInlineTextCellEditor },
})

type PreviewSourceTab = { id: string; label: string; view: TableViewProps['view'] }

export default function TablePreview(props: TableViewProps & { multiDimensional?: boolean; sourceTabs?: readonly PreviewSourceTab[] }) {
  const [activeSourceTabId, setActiveSourceTabId] = React.useState(props.sourceTabs?.[0]?.id ?? '')
  const activeSourceTab = props.sourceTabs?.find(tab => tab.id === activeSourceTabId) ?? props.sourceTabs?.[0]
  const sourceView = activeSourceTab?.view ?? props.view
  const [headerState, setHeaderState] = React.useState<WorkspaceDataViewHeaderState>({ searchQuery: '', visibleGroups: null, sortMode: 'none' })
  const [viewConfig, setViewConfig] = React.useState<WorkspaceDataViewConfig>({
    v: 3, id: 'agentic-base-preview', name: 'Multi-dimensional Table', layout: 'table',
    groupByColumnId: props.view.groupByColumnId, visibleColumnIds: null, columnTypesById: null,
    filterGroups: [], sortRules: [], orientation: 'rows', graphEnabled: true,
  })
  const [settingsPanel, setSettingsPanel] = React.useState<string | null>(null)
  const visibleColumnIds = props.multiDimensional
    ? sourceView.columns.filter(column => column.name !== 'Level' && column.name !== 'Indent').map(column => column.id)
    : undefined
  const previewView = React.useMemo(() => {
    const needle = headerState.searchQuery.trim().toLocaleLowerCase()
    const rows = sourceView.rows.filter(row => !needle || row.cells.join(' ').toLocaleLowerCase().includes(needle))
    if (headerState.sortMode !== 'none') {
      const direction = headerState.sortMode === 'title_asc' ? 1 : -1
      const titleIndex = sourceView.columns.findIndex(column => column.id === sourceView.titleColumnId)
      rows.sort((left, right) => direction * String(left.cells[titleIndex] ?? '').localeCompare(String(right.cells[titleIndex] ?? ''), undefined, { numeric: true, sensitivity: 'base' }))
    }
    return { ...sourceView, rows }
  }, [headerState.searchQuery, headerState.sortMode, sourceView])
  const View = props.multiDimensional ? MultiDimTableView : TableView
  const { sourceTabs, multiDimensional, ...tableProps } = props
  return <section aria-label="Shared Table preview" className="kg-workspace-data-view-root h-full w-full" style={{ background: 'var(--kg-panel-bg, #fff)' }}>
    {props.multiDimensional ? <WorkspaceDataViewHeader
      title="Runtime capabilities"
      viewerMode="multiDimTable"
      canMutate={props.canMutate}
      columns={sourceView.columns}
      groupByColumnId={viewConfig.groupByColumnId}
      state={headerState}
      onChangeState={setHeaderState}
      supportsMultiDimLayout
      viewConfig={null}
      setViewConfig={setViewConfig}
      openSettings={() => setSettingsPanel('properties')}
      openSettingsPanel={panel => setSettingsPanel(panel)}
      onNewRecord={props.onNewRecord}
      tableSelector={sourceTabs && sourceTabs.length > 1 ? <WorkspaceModeSelect
        value={activeSourceTab?.id ?? sourceTabs[0].id}
        ariaLabel="Select data view table"
        options={sourceTabs.map(tab => ({ value: tab.id, label: tab.label }))}
        presentation="tabs"
        onChange={setActiveSourceTabId}
      /> : undefined}
    /> : <h2 className="mb-3 text-lg font-semibold text-[color:var(--kg-text-primary)]">Shared Table view</h2>}
    {settingsPanel ? <aside className="flex items-center justify-between gap-3 border-b border-[color:var(--kg-border)] bg-[color:var(--kg-panel-header-bg)] px-3 py-2 text-sm" aria-label={`${settingsPanel} settings`}>
      <span>Host-owned {settingsPanel} settings are supplied by the consuming application.</span>
      <button type="button" className="rounded border border-[color:var(--kg-border)] px-2 py-1" onClick={() => setSettingsPanel(null)}>Close</button>
    </aside> : null}
    <TableHostProvider value={multiDimensional ? baseTableHost : previewTableHost}>
      {multiDimensional
        ? <MultiDimTableView {...tableProps} view={previewView} visibleColumnIds={visibleColumnIds} orientation={viewConfig.orientation} showPivotControl onOrientationChange={orientation => setViewConfig(current => ({ ...current, orientation }))} />
        : <TableView {...tableProps} view={previewView} visibleColumnIds={visibleColumnIds} />}
    </TableHostProvider>
  </section>
}
