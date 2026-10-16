import React from 'react'
import { createRoot } from 'react-dom/client'
import { DataViewStatusChip, DataViewTagChip } from '@/features/markdown/ui/MarkdownDataViewChips'
import { WorkspaceDataViewNewRecordButton } from '@/features/markdown-workspace/main/viewer/WorkspaceDataViewNewRecordButton'
import { MARKDOWN_DATA_VIEW_COPY } from '@/lib/config-copy/markdownDataViewCopy'
import { buildCardParagraphEntries } from '@/lib/cards/cardParagraphs'
import { UI_THEME_TOKENS } from '@/lib/ui/theme-tokens'
import {
  UI_RESPONSIVE_CARD_MULTILINE_EDITOR_CLASSNAME,
  UI_RESPONSIVE_CARD_TITLE_EDITOR_CLASSNAME,
  UI_RESPONSIVE_DATA_VIEW_COMPACT_MENU_PANEL_CLASSNAME,
  UI_RESPONSIVE_DATA_VIEW_KANBAN_CARD_LIST_CLASSNAME,
  UI_RESPONSIVE_DATA_VIEW_KANBAN_GROUP_CLASSNAME,
  UI_RESPONSIVE_DATA_VIEW_KANBAN_STATUS_ROW_CLASSNAME,
  UI_RESPONSIVE_ELEMENT_ROW_CLASSNAME,
  UI_RESPONSIVE_KANBAN_DROP_INDICATOR_CLASSNAME,
  UI_RESPONSIVE_MENU_ROW_CLASSNAME,
  UI_RESPONSIVE_SMALL_ICON_ACTION_CLASSNAME,
} from '@/lib/ui/responsiveElementClasses'
import { UI_TEXT_TRUNCATE } from '@/lib/ui/textLayout'
import { uiToolbarRowScrollClassName } from '@/features/toolbar/ui/toolbarStyles'
import { UI_INTENT_TOKENS } from 'grph-shared/ui/intentTokens'
import { splitMultiValues } from '@/features/markdown/ui/markdownDataViewValueUtils'
import { DashboardBarChart, DashboardCanvasLayout, DashboardCardGrid, DashboardLineAreaChart, DashboardMetricTile, DashboardWidgetBoard, DashboardWidgetCard, DashboardWidgetDisclosure, DashboardWidgetEditor, DashboardWidgetFrame, DashboardWidgetLayoutSettings, DashboardWidgetPalette, DashboardWidgetSection, dashboardColumnStyle, dashboardWidgetRows, type DashboardWidgetEditorField } from '../src/dashboard'
import { FieldWorkbench, FieldWorkbenchGroup, FieldWorkbenchItem, FieldWorkbenchSearch, SettingsPanelShell, ViewSettingsPanel, type SavedViewOption, type ViewLayout } from '../src/settings'
import { SettingsHostProvider } from '../src/settings/SettingsHostContext'
import { graphSettingsHost } from './GraphSettingsHost'
import { FloatingPanelCloseButton, FloatingPanelShell } from '../src/panels'
import { KanbanHostProvider, type KanbanHostAdapter, type ViewModel, type ViewRow } from '../src/kanban/KanbanHostContext'
import { KanbanView } from '../src/kanban/KanbanView'
import { CalendarView } from '../src/calendar'
import './styles.css'

const LazyTablePreview = React.lazy(() => import('./TablePreview'))

const InlineTextEditor: KanbanHostAdapter['components']['InlineTextEditor'] = props => {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(props.value)
  React.useEffect(() => setDraft(props.value), [props.value])
  const commit = () => {
    if (draft !== props.value) props.onCommit?.(draft)
    setEditing(false)
  }
  if (editing && props.canEdit) {
    const sharedProps = {
      value: draft,
      className: props.editorClassName,
      'aria-label': props.ariaLabel,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(event.target.value),
      onBlur: commit,
      onKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !props.multiline) { event.preventDefault(); commit() }
        if (event.key === 'Escape') { setDraft(props.value); setEditing(false) }
      },
      autoFocus: true,
    }
    return props.multiline ? <textarea {...sharedProps} rows={props.rows ?? 2} /> : <input {...sharedProps} />
  }
  return <p className={props.displayClassName} onClick={() => props.canEdit && setEditing(true)}>{props.value || props.placeholder}</p>
}

const graphHost: KanbanHostAdapter = {
  theme: {
    badge: { chip: UI_THEME_TOKENS.badge.chip },
    button: { hoverBg: UI_THEME_TOKENS.button.hoverBg },
    focus: { primarySoftRing: UI_THEME_TOKENS.focus.primarySoftRing, primarySofterRing: UI_THEME_TOKENS.focus.primarySofterRing },
    icon: { color: UI_THEME_TOKENS.icon.color },
    input: { border: UI_THEME_TOKENS.input.border, text: UI_THEME_TOKENS.input.text },
    kanban: { cardBg: UI_THEME_TOKENS.kanban.cardBg, cardHoverBg: UI_THEME_TOKENS.kanban.cardHoverBg, cellBg: UI_THEME_TOKENS.kanban.cellBg, groupBg: UI_THEME_TOKENS.kanban.groupBg },
    panel: { bg: UI_THEME_TOKENS.panel.bg, border: UI_THEME_TOKENS.panel.border, divider: UI_THEME_TOKENS.panel.divider },
    text: { primary: UI_THEME_TOKENS.text.primary, secondary: UI_THEME_TOKENS.text.secondary, tertiary: UI_THEME_TOKENS.text.tertiary },
  },
  classes: {
    cardMultilineEditor: UI_RESPONSIVE_CARD_MULTILINE_EDITOR_CLASSNAME,
    cardTitleEditor: UI_RESPONSIVE_CARD_TITLE_EDITOR_CLASSNAME,
    compactMenuPanel: UI_RESPONSIVE_DATA_VIEW_COMPACT_MENU_PANEL_CLASSNAME,
    clickExpandMenuChildren: '',
    kanbanCardList: UI_RESPONSIVE_DATA_VIEW_KANBAN_CARD_LIST_CLASSNAME,
    kanbanCardHoverShadow: UI_THEME_TOKENS.kanban.cardHoverShadow,
    kanbanCardRadius: UI_THEME_TOKENS.kanban.cardRadius,
    kanbanCardShadow: UI_THEME_TOKENS.kanban.cardShadow,
    kanbanDropIndicator: UI_RESPONSIVE_KANBAN_DROP_INDICATOR_CLASSNAME,
    kanbanFloatingMenu: 'kg-data-view-floating-menu',
    kanbanFloatingMenuChildren: '',
    kanbanGroup: UI_RESPONSIVE_DATA_VIEW_KANBAN_GROUP_CLASSNAME,
    kanbanStatusRow: UI_RESPONSIVE_DATA_VIEW_KANBAN_STATUS_ROW_CLASSNAME,
    menuRow: UI_RESPONSIVE_MENU_ROW_CLASSNAME,
    panelActionButton: 'kg-panel-action-btn',
    panelBackground: UI_THEME_TOKENS.panel.bg,
    panelIconButton: 'kg-panel-icon-btn',
    responsiveRow: UI_RESPONSIVE_ELEMENT_ROW_CLASSNAME,
    smallIconAction: UI_RESPONSIVE_SMALL_ICON_ACTION_CLASSNAME,
    textTruncate: UI_TEXT_TRUNCATE,
    toolbarRowScroll: uiToolbarRowScrollClassName,
  },
  copy: {
    cardActionsLabel: MARKDOWN_DATA_VIEW_COPY.cardActionsLabel,
    cardMenuLabel: MARKDOWN_DATA_VIEW_COPY.cardMenuLabel,
    expandCardLabel: MARKDOWN_DATA_VIEW_COPY.expandCardLabel,
    kanbanViewLabel: MARKDOWN_DATA_VIEW_COPY.kanbanViewLabel,
    moveToLabel: MARKDOWN_DATA_VIEW_COPY.moveToLabel,
    ungroupedLabel: MARKDOWN_DATA_VIEW_COPY.ungroupedLabel,
  },
  primaryIndicator: UI_INTENT_TOKENS.primary.indicator,
  interactiveTargetSelector: '[data-kg-command-menu], [data-kg-inline-editor="1"]',
  markers: {
    card: 'data-kg-kanban-card',
    cardActions: 'data-kg-kanban-actions',
    cardDragRegion: 'data-kg-kanban-card-drag-region',
    divider: 'data-kg-kanban-divider',
    group: 'data-kg-kanban-group',
    groupActions: 'data-kg-kanban-group-actions',
    groupHeader: 'data-kg-kanban-group-header',
    groupList: 'data-kg-kanban-group-list',
  },
  components: {
    InlineTextEditor,
    NewRecordButton: WorkspaceDataViewNewRecordButton,
    StatusChip: DataViewStatusChip,
    TagChip: DataViewTagChip,
  },
  data: { buildParagraphEntries: buildCardParagraphEntries, splitValues: splitMultiValues },
}

const columns = [
  { id: 'title', name: 'Task', kind: 'text' as const },
  { id: 'status', name: 'Status', kind: 'select' as const, options: ['Todo', 'Doing', 'Done'] },
  { id: 'owner', name: 'Owner', kind: 'text' as const },
  { id: 'tags', name: 'Tags', kind: 'multi-select' as const },
  { id: 'due', name: 'Due date', kind: 'text' as const },
]

const initialRows: ViewRow[] = [
  { id: 'task-1', cells: ['Review launch checklist', 'Todo', 'Mina', 'launch, review', '2026-10-16'] },
  { id: 'task-2', cells: ['Confirm packaging copy', 'Todo', 'Alex', 'content', '2026-10-17'] },
  { id: 'task-3', cells: ['Prepare customer demo', 'Doing', 'Ravi', 'demo, customer', '2026-10-21'] },
  { id: 'task-4', cells: ['Check mobile layout', 'Doing', 'Mina', 'mobile, ui', ''] },
  { id: 'task-5', cells: ['Publish release notes', 'Done', 'Alex', 'release', '2026-10-31'] },
]

function DashboardPreview() {
  const [showNotes, setShowNotes] = React.useState(true)
  const [chartsExpanded, setChartsExpanded] = React.useState(true)
  const [layoutId, setLayoutId] = React.useState('metrics')
  const [layoutColumns, setLayoutColumns] = React.useState(3)
  const [layoutStatus, setLayoutStatus] = React.useState('')
  const [selectedWidget, setSelectedWidget] = React.useState('trend')
  const [widgetSource, setWidgetSource] = React.useState('trend')
  const [widgetTitle, setWidgetTitle] = React.useState('Record trend')
  const [widgetDescription, setWidgetDescription] = React.useState('Record activity over time.')
  const [widgetNote, setWidgetNote] = React.useState('Chart values are supplied by the host.')
  const [widgetDisplay, setWidgetDisplay] = React.useState('line')
  const [widgetAspect, setWidgetAspect] = React.useState('16:9')
  const [widgetWidth, setWidgetWidth] = React.useState(640)
  const [widgetHeight, setWidgetHeight] = React.useState(360)
  const [widgetColumns, setWidgetColumns] = React.useState(2)
  const [widgetTone, setWidgetTone] = React.useState('blue')
  const [widgetOrder, setWidgetOrder] = React.useState(0)
  const [widgetExpanded, setWidgetExpanded] = React.useState(true)
  const [widgetVisible, setWidgetVisible] = React.useState(true)
  const [containedWidgets, setContainedWidgets] = React.useState<readonly string[]>(['trend'])
  const [widgetStatus, setWidgetStatus] = React.useState('')
  const widgetEditorFields: DashboardWidgetEditorField[] = [
    { id: 'widget', label: 'Widget', type: 'select', value: selectedWidget, options: [{ value: 'new', label: 'New widget' }, { value: 'trend', label: 'Record trend' }, { value: 'activity', label: 'Daily activity' }] },
    { id: 'source', label: 'Data source', type: 'select', value: widgetSource, options: [{ value: 'trend', label: 'Record trend' }, { value: 'activity', label: 'Daily activity' }] },
    { id: 'title', label: 'Title', type: 'text', value: widgetTitle, maxLength: 256 },
    { id: 'description', label: 'Description', type: 'text', value: widgetDescription, maxLength: 256 },
    { id: 'note', label: 'Note', type: 'textarea', value: widgetNote, maxLength: 256 },
    { id: 'display', label: 'Display', type: 'select', value: widgetDisplay, options: [{ value: 'bar', label: 'bar' }, { value: 'line', label: 'line' }, { value: 'area', label: 'area' }, { value: 'table', label: 'table' }] },
    { id: 'aspect', label: 'Aspect ratio', type: 'select', value: widgetAspect, options: [{ value: '16:9', label: '16:9 (Default)' }, { value: '9:16', label: '9:16' }, { value: 'custom', label: 'Custom · drag to resize' }] },
    ...(widgetAspect === 'custom' ? [
      { id: 'width', label: 'width', type: 'number' as const, value: widgetWidth, min: 120, max: 4096 },
      { id: 'height', label: 'height', type: 'number' as const, value: widgetHeight, min: 120, max: 4096 },
    ] : []),
    { id: 'columns', label: 'Container columns', type: 'number', value: widgetColumns, min: 1, max: 12 },
    { id: 'contained', label: 'Contained widgets', type: 'checkbox-list', value: containedWidgets, options: [{ value: 'trend', label: 'Record trend' }, { value: 'activity', label: 'Daily activity' }] },
    { id: 'tone', label: 'Card color', type: 'select', value: widgetTone, options: ['blue', 'green', 'amber', 'rose', 'slate'].map(value => ({ value, label: value })) },
    { id: 'order', label: 'Order', type: 'number', value: widgetOrder, min: -10000, max: 10000, step: 1 },
    { id: 'expanded', label: 'Expanded', type: 'checkbox', checked: widgetExpanded },
    { id: 'visible', label: 'Show on canvas', type: 'checkbox', checked: widgetVisible },
    { id: 'markdown', label: 'Markdown content', type: 'custom', content: <section className="rounded border p-2"><p className="m-0 text-xs">Markdown rendering and editing are host-provided.</p></section> },
  ]
  const updateWidgetEditorField = (id: string, value: string | number | boolean | readonly string[]) => {
    if (id === 'widget' && typeof value === 'string') setSelectedWidget(value)
    if (id === 'source' && typeof value === 'string') setWidgetSource(value)
    if (id === 'title' && typeof value === 'string') setWidgetTitle(value)
    if (id === 'description' && typeof value === 'string') setWidgetDescription(value)
    if (id === 'note' && typeof value === 'string') setWidgetNote(value)
    if (id === 'display' && typeof value === 'string') setWidgetDisplay(value)
    if (id === 'aspect' && typeof value === 'string') setWidgetAspect(value)
    if (id === 'width' && typeof value === 'number') setWidgetWidth(value)
    if (id === 'height' && typeof value === 'number') setWidgetHeight(value)
    if (id === 'columns' && typeof value === 'number') setWidgetColumns(value)
    if (id === 'contained' && Array.isArray(value)) setContainedWidgets(value)
    if (id === 'tone' && typeof value === 'string') setWidgetTone(value)
    if (id === 'order' && typeof value === 'number') setWidgetOrder(value)
    if (id === 'expanded' && typeof value === 'boolean') setWidgetExpanded(value)
    if (id === 'visible' && typeof value === 'boolean') setWidgetVisible(value)
  }
  const accentClassNameByRole = {
    primary: 'border-sky-500/40',
    secondary: 'border-violet-500/40',
    success: 'border-emerald-500/40',
  } as const
  const actionClassName = 'rounded border px-2 py-1 text-xs'
  const paletteToolbar = (title: string) => ({ visible, onFlip }: { visible: boolean; onFlip: () => void }) => visible
    ? <button type="button" data-agentic-base-dashboard-action="flip" className={actionClassName} onClick={onFlip}>Configure {title}</button>
    : null
  const paletteConfiguration = (title: string) => ({ onClose }: { onClose: () => void }) => <section className="space-y-2 rounded border p-3">
    <h3 className="font-semibold">Configure {title}</h3>
    <p className="text-sm">The host supplies the template settings.</p>
    <button type="button" className={actionClassName} onClick={onClose}>Close settings</button>
  </section>
  const series = [
    { label: 'Mon', value: 12, detail: '12 records' },
    { label: 'Tue', value: 18, detail: '18 records' },
    { label: 'Wed', value: 15, detail: '15 records' },
    { label: 'Thu', value: 27, detail: '27 records' },
    { label: 'Fri', value: 22, detail: '22 records' },
  ]
  const frameChart = (id: string, title: string, accent: string, chart: React.ReactNode) => <DashboardWidgetFrame
    id={id} template="chart" title={title}
    resize={id === 'trend' && widgetAspect !== '16:9' ? { aspectRatio: widgetAspect === 'custom' ? 'custom' : '9:16',
      enabled: widgetAspect === 'custom', width: widgetWidth, height: widgetHeight, snapGrid: { x: 10, y: 10 },
      onResize: size => { setWidgetWidth(size.width); setWidgetHeight(size.height) } } : undefined}
    toolbar={({ visible, onFlip }) => visible ? <button type="button" data-agentic-base-dashboard-action="flip" className={actionClassName} onClick={onFlip}>Configure</button> : null}
    configuration={({ onClose }) => <section className="space-y-2 rounded border p-3"><h3 className="font-semibold">Configure {title}</h3><p className="text-sm">Settings content is supplied by the host.</p><button type="button" className={actionClassName} onClick={onClose}>Close settings</button></section>}>
    <DashboardWidgetCard id={`${id}-card`} label={title} title={<h3 className="m-0 truncate text-sm font-semibold text-[color:var(--kg-text-primary)]">{title}</h3>}
      subtitle="Shared widget card · host supplied content" footnote="Card structure and drag presentation are shared; chart data stays in the host."
      className={`min-w-0 ${accent}`}>
      <div className="h-52">{chart}</div>
    </DashboardWidgetCard>
  </DashboardWidgetFrame>
  const chartItems = [
    { id: 'trend', content: frameChart('trend', 'Record trend', 'border-sky-500/40', <DashboardLineAreaChart series={series} tone="blue" gridEnabled area />) },
    { id: 'activity', content: frameChart('activity', 'Daily activity', 'border-emerald-500/40', <DashboardBarChart series={series} tone="green" gridEnabled />) },
  ]
  return <DashboardCanvasLayout
    ariaLabel="Agent Mission dashboard"
    title={<h1 className="m-0 text-xl font-semibold">Agent Mission · workspace overview</h1>}
    description={<p className="m-0 text-sm text-[color:var(--kg-text-secondary)]">Shared responsive shell; the host supplies data, theme, and actions.</p>}
    hero={<DashboardLineAreaChart series={series} tone="blue" gridEnabled area />}
    observation="Local preview snapshot · data and commands are host supplied."
    overview={<DashboardCardGrid
      ariaLabel="Agent Mission dashboard summary"
      accentClassNameByRole={accentClassNameByRole}
      eyebrowClassName="uppercase tracking-wide"
      descriptionClassName="text-[color:var(--kg-text-secondary)]"
      cards={[
        { id: 'index', accent: 'primary', eyebrow: <span className="text-sky-500">01 · INDEX</span>, title: 'No linked sources', description: 'Load a retained codebase graph index.', actions: <button type="button" className={actionClassName}>Index manifest</button> },
        { id: 'traverse', accent: 'secondary', eyebrow: <span className="text-violet-500">02 · TRAVERSE & CONTEXTUALIZE</span>, title: 'Source knowledge graph', description: 'Start with highly connected nodes, then load exact-snapshot neighbors on demand.', actions: <button type="button" className={actionClassName}>Explore codebase · D3</button> },
        { id: 'observe', accent: 'success', eyebrow: <span className="text-emerald-500">03 · OBSERVE & EVALUATE</span>, title: 'failed · unevaluated', description: '2/2 retained spans · 1 worktree · Partial trace', content: 'Evaluation score: Unknown', actions: <><button type="button" className={actionClassName}>Mission manifest</button><button type="button" className={actionClassName}>Evaluation evidence</button></> },
      ]}
    />}
    metrics={<div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="group" aria-label="Metric values">
      <DashboardMetricTile id="active-records" label="Active records" value="128" detail="Across current views" toneClassName="border-sky-500/40 bg-sky-50" />
      <DashboardMetricTile id="saved-views" label="Saved views" value="6" detail="Table, board, and calendar" toneClassName="border-violet-500/40 bg-violet-50" />
      <DashboardMetricTile id="updates" label="Recent updates" value="24" detail="During the last 7 days" toneClassName="border-emerald-500/40 bg-emerald-50" />
    </div>}
    sections={<DashboardWidgetSection id="chart-widgets" expanded={chartsExpanded}
      title={<h2 className="m-0 text-base font-semibold"><button type="button" aria-expanded={chartsExpanded} onClick={() => setChartsExpanded(value => !value)}>Dashboard chart views</button></h2>}
      description="Section visibility and expansion are controlled by the host adapter.">
      <DashboardWidgetBoard ariaLabel="Dashboard chart views" id="chart-widgets"
        items={chartItems} rows={dashboardWidgetRows([['trend', 'activity']], chartItems.map(item => item.id), 2)}
        columnStyle={columns => dashboardColumnStyle(0, columns, { enabled: false, x: 10 })} />
    </DashboardWidgetSection>}
  >
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Dashboard widget templates">
      <DashboardWidgetPalette templates={[
        { id: 'metric', kind: 'metric', title: 'Metric', toolbar: paletteToolbar('Metric'), configuration: paletteConfiguration('Metric'),
          preview: <DashboardMetricTile id="template-metric" label="Metric" value="—" detail="Select, then configure" toneClassName="border-slate-300" /> },
        { id: 'chart', kind: 'line', title: 'Line chart', toolbar: paletteToolbar('Line chart'), configuration: paletteConfiguration('Line chart'),
          preview: <DashboardWidgetCard id="template-line" label="Line chart" title={<h3 className="m-0 text-sm font-semibold">Line chart</h3>} subtitle="Template preview" footnote="Data is host supplied."><div className="h-40"><DashboardLineAreaChart series={series} tone="blue" gridEnabled /></div></DashboardWidgetCard> },
        { id: 'text', kind: 'text', title: 'Text', toolbar: paletteToolbar('Text'), configuration: paletteConfiguration('Text'),
          preview: <DashboardWidgetCard id="template-text" label="Text" title={<h3 className="m-0 text-sm font-semibold">Text</h3>} subtitle="Template preview"><p className="text-sm">Write Markdown in the host editor.</p></DashboardWidgetCard> },
      ]} />
    </ul>
    <SettingsHostProvider value={graphSettingsHost}><div className="space-y-4">
      <SettingsPanelShell ariaLabel="Main panel dashboard settings" title={<strong>Dashboard settings</strong>} summary="Layout controls supplied by the host">
        <DashboardWidgetLayoutSettings
          options={[{ id: 'metrics', label: 'Metrics' }, { id: 'charts', label: 'Chart views' }, { id: 'activity', label: 'Recent activity' }]}
          selectedId={layoutId} onSelectedIdChange={setLayoutId} columns={layoutColumns} onColumnsChange={setLayoutColumns}
          rowCount={Math.ceil(3 / Math.max(1, layoutColumns))} widgetCount={3}
          onApply={() => setLayoutStatus(`Layout saved for ${layoutId}.`)} statusMessage={layoutStatus} />
      </SettingsPanelShell>
      <DashboardWidgetEditor title={widgetTitle} fields={widgetEditorFields} onFieldChange={updateWidgetEditorField}
        saveLabel="Save widget" onSave={() => setWidgetStatus(`Saved ${widgetTitle}.`)} onClose={() => setWidgetStatus('Editor closed.')}
        onRemove={() => setWidgetStatus(`Removed ${widgetTitle}.`)} removeLabel="Remove widget" className="max-h-[70vh]" />
      {widgetStatus ? <p role="status" className="text-xs">{widgetStatus}</p> : null}
    </div>
    </SettingsHostProvider>
    <DashboardWidgetDisclosure id="preview-notes" title="Widget details" expanded={showNotes} onExpandedChange={setShowNotes}>
      <p className="mt-2 text-sm text-[color:var(--kg-text-secondary)]">Expansion state is controlled by the host adapter.</p>
    </DashboardWidgetDisclosure>
  </DashboardCanvasLayout>
}

function WorkflowManagerPreview() {
  const actionClass = 'rounded border border-[color:var(--kg-border)] px-2 py-1 text-xs hover:bg-gray-50'
  const [search, setSearch] = React.useState('')
  const [selected, setSelected] = React.useState('Kind')
  const fields = [
    { group: 'Global Fields', label: 'Global Schema', type: 'schema' },
    { group: 'Global Fields', label: 'Local schema · Validation', type: 'rules' },
    { group: 'Base Fields', label: 'Kind', type: 'kind' },
    { group: 'Base Fields', label: 'Step', type: 'traversalStep' },
    { group: 'Base Fields', label: 'ID', type: 'id' },
    { group: 'Base Fields', label: 'Label', type: 'label' },
    { group: 'Custom Fields', label: 'semanticKey', type: 'text' },
    { group: 'Custom Fields', label: 'roles', type: 'list' },
  ]
  const visible = fields.filter(field => `${field.group} ${field.label} ${field.type}`.toLowerCase().includes(search.toLowerCase()))
  const groups = [...new Set(visible.map(field => field.group))]
  return <SettingsPanelShell ariaLabel="Main panel Workflow Manager" title={<strong>Workflow Manager</strong>} summary="Fields · host-owned schema and actions">
    <FieldWorkbench ariaLabel="Workflow Manager fields" toolbar={<><FieldWorkbenchSearch value={search} onChange={setSearch} placeholder="Search fields…" /><button type="button" className={actionClass}>Field shortcuts…</button></>}
      listLabel="Graph Fields" listSummary={`Visible ${visible.length} · Total ${fields.length}`}
      listContent={<>{groups.map(group => <FieldWorkbenchGroup key={group} title={group} count={visible.filter(field => field.group === group).length}>
        {visible.filter(field => field.group === group).map(field => <FieldWorkbenchItem key={field.label} label={field.label} type={field.type} selected={selected === field.label} onSelect={() => setSelected(field.label)} />)}
      </FieldWorkbenchGroup>)}</>}
      detailLabel="Field Settings" detailContent={<div className="space-y-3">
        <label className="grid gap-1 text-xs">Name<input className="rounded border border-[color:var(--kg-border)] bg-white px-2 py-2 text-sm" value={selected} readOnly /></label>
        <label className="grid gap-1 text-xs">Type<select className="rounded border border-[color:var(--kg-border)] bg-white px-2 py-2 text-sm" defaultValue="Single line text"><option>Single line text</option><option>Multiple select</option><option>Number</option></select></label>
        <label className="grid gap-1 text-xs">Description<textarea className="min-h-24 rounded border border-[color:var(--kg-border)] bg-white p-2 text-sm" placeholder="Host-provided field description" /></label>
        <section className="space-y-2 rounded border border-[color:var(--kg-border)] p-3"><strong className="text-sm">Schema</strong><p className="m-0 text-xs text-[color:var(--kg-text-secondary)]">Node type · constraints are provided by the consumer.</p><label className="flex gap-2 text-xs"><input type="checkbox" /> Required</label><label className="flex gap-2 text-xs"><input type="checkbox" /> Unique</label></section>
      </div>} />
  </SettingsPanelShell>
}

function FloatingPanelPreview() {
  const [open, setOpen] = React.useState(true)
  const [pinned, setPinned] = React.useState(true)
  if (!open) return <button type="button" onClick={() => setOpen(true)}>Open View panel</button>
  return <section className="relative min-h-[32rem] overflow-hidden rounded border border-[color:var(--kg-border)] bg-[color:var(--kg-app-bg)]" aria-label="Floating panel preview surface">
    <FloatingPanelShell ariaLabel="View floating panel" rootClassName="absolute inset-2 z-10"
      panelStyle={{ width: 'min(28rem, 100%)', height: '100%' }} pinned={pinned}
      header={<><div className="min-w-0"><strong className="block truncate text-sm">View</strong><span className="block truncate text-xs text-[color:var(--kg-text-secondary)]">Markdown YAML Frontmatter</span></div>
        <div className="flex shrink-0 items-center gap-1"><button type="button" aria-pressed={pinned} onClick={() => setPinned(value => !value)}>{pinned ? 'Unpin' : 'Pin'}</button>
          <FloatingPanelCloseButton label="Close View panel" onClose={() => setOpen(false)} /></div></>}>
      <section className="min-h-0 flex-1 overflow-y-auto rounded border border-[color:var(--kg-border)] bg-white p-3" aria-label="View settings content">
        <p className="m-0 text-sm">Shared FloatingPanel shell</p>
        <p className="text-xs text-[color:var(--kg-text-secondary)]">Placement, pin state, and view content are supplied by the consumer.</p>
        <label className="grid gap-1 text-xs">Projection<select className="rounded border border-[color:var(--kg-border)] p-2"><option>Rows as records</option><option>Value columns</option></select></label>
      </section>
    </FloatingPanelShell>
  </section>
}

function Preview() {
  const [rows, setRows] = React.useState(initialRows)
  const [selected, setSelected] = React.useState('No record selected')
  const [selectedRowId, setSelectedRowId] = React.useState<string | null>(null)
  const [activeView, setActiveView] = React.useState<'kanban' | 'table' | 'multiDimensional' | 'calendar' | 'dashboard' | 'workflow' | 'viewSettings' | 'floatingPanel'>('kanban')
  const [savedViews, setSavedViews] = React.useState<SavedViewOption[]>([
    { id: 'table', name: 'Table View', layout: 'table' },
    { id: 'multi', name: 'Multi-dimensional Table', layout: 'multiDimTable' },
    { id: 'kanban', name: 'Kanban View', layout: 'kanban' },
    { id: 'calendar', name: 'Calendar View', layout: 'calendar' },
  ])
  const [activeSavedViewId, setActiveSavedViewId] = React.useState('table')
  const [savedViewName, setSavedViewName] = React.useState('Table View')
  const [savedViewLayout, setSavedViewLayout] = React.useState<ViewLayout>('table')
  const [graphEnabled, setGraphEnabled] = React.useState(false)
  const [rowHeight, setRowHeight] = React.useState<'compact' | 'comfortable'>('comfortable')
  const [fieldLineMode, setFieldLineMode] = React.useState<'single' | 'double' | 'flex'>('single')
  const [calendarConfig, setCalendarConfig] = React.useState({ startColumnId: 'due', endColumnId: null, timeZone: 'Asia/Singapore', month: '2026-10' })
  const view: ViewModel = React.useMemo(() => ({ columns, rows, titleColumnId: 'title', groupByColumnId: 'status' }), [rows])
  const activateRow = React.useCallback((rowId: string) => {
    setSelectedRowId(rowId)
    setSelected(rows.find(row => row.id === rowId)?.cells[0] || rowId)
  }, [rows])
  const onUpdateCell = React.useCallback(({ rowId, columnId, nextValue }: { rowId: string; columnId: string; nextValue: string }) => {
    const columnIndex = columns.findIndex(column => column.id === columnId)
    setRows(current => current.map(row => row.id === rowId ? { ...row, cells: row.cells.map((value, index) => index === columnIndex ? nextValue : value) } : row))
  }, [])
  const onNewRecord = React.useCallback((seed?: Partial<Record<string, string>>) => {
    setRows(current => [...current, { id: `task-${current.length + 1}`, cells: [seed?.title || 'New task', seed?.status || 'Todo', seed?.owner || 'Unassigned', seed?.tags || '', seed?.due || ''] }])
  }, [])
  const selectSavedView = React.useCallback((id: string) => {
    const selectedView = savedViews.find(view => view.id === id)
    if (!selectedView) return
    setActiveSavedViewId(id)
    setSavedViewName(selectedView.name)
    setSavedViewLayout(selectedView.layout)
  }, [savedViews])
  const updateSavedViewName = React.useCallback((name: string) => {
    setSavedViewName(name)
    setSavedViews(current => current.map(view => view.id === activeSavedViewId ? { ...view, name } : view))
  }, [activeSavedViewId])
  const updateSavedViewLayout = React.useCallback((layout: ViewLayout) => {
    setSavedViewLayout(layout)
    setSavedViews(current => current.map(view => view.id === activeSavedViewId ? { ...view, layout } : view))
  }, [activeSavedViewId])
  const duplicateSavedView = React.useCallback(() => {
    const id = `view-${savedViews.length + 1}`
    const name = `${savedViewName || 'Untitled view'} copy`
    setSavedViews(current => [...current, { id, name, layout: savedViewLayout }])
    setActiveSavedViewId(id)
    setSavedViewName(name)
  }, [savedViews.length, savedViewName, savedViewLayout])
  const deleteSavedView = React.useCallback(() => {
    if (savedViews.length < 2) return
    const remaining = savedViews.filter(view => view.id !== activeSavedViewId)
    const next = remaining[0]
    setSavedViews(remaining)
    if (next) selectSavedView(next.id)
  }, [activeSavedViewId, savedViews, selectSavedView])
  const onReorderRows = React.useCallback(({ orderedRowIds, rowPatch }: { orderedRowIds: readonly string[]; rowPatch?: { rowId: string; columnId: string; nextValue: string } }) => {
    setRows(current => {
      const patched = rowPatch ? current.map(row => row.id === rowPatch.rowId ? { ...row, cells: row.cells.map((value, index) => index === columns.findIndex(column => column.id === rowPatch.columnId) ? rowPatch.nextValue : value) } : row) : current
      const rowsById = new Map(patched.map(row => [row.id, row]))
      return [...orderedRowIds.map(id => rowsById.get(id)).filter((row): row is ViewRow => !!row), ...patched.filter(row => !orderedRowIds.includes(row.id))]
    })
  }, [])
  return <main className="mx-auto min-h-screen max-w-screen-2xl p-4 sm:p-6">
    <header className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-[color:var(--kg-border)] pb-3">
      <div><p className="m-0 text-xs uppercase tracking-wide text-[color:var(--kg-text-tertiary)]">Private package preview · existing host adapter</p><h1 className="m-0 text-xl font-semibold text-[color:var(--kg-text-primary)]">Shared data views</h1></div>
      <span className="text-sm text-[color:var(--kg-text-secondary)]">Same Base component · host-supplied Graph tokens and controls</span>
    </header>
    <nav className="mb-3 flex min-w-0 flex-wrap gap-2" aria-label="Data view layout">
      <button type="button" aria-pressed={activeView === 'kanban'} onClick={() => setActiveView('kanban')}>Kanban</button>
      <button type="button" aria-pressed={activeView === 'table'} onClick={() => setActiveView('table')}>Table</button>
      <button type="button" aria-pressed={activeView === 'multiDimensional'} onClick={() => setActiveView('multiDimensional')}>Multi-dimensional Table</button>
      <button type="button" aria-pressed={activeView === 'calendar'} onClick={() => setActiveView('calendar')}>Calendar</button>
      <button type="button" aria-pressed={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')}>Dashboard</button>
      <button type="button" aria-pressed={activeView === 'viewSettings'} onClick={() => setActiveView('viewSettings')}>View settings</button>
      <button type="button" aria-pressed={activeView === 'floatingPanel'} onClick={() => setActiveView('floatingPanel')}>Floating panel</button>
      <button type="button" aria-pressed={activeView === 'workflow'} onClick={() => setActiveView('workflow')}>Workflow Manager</button>
    </nav>
    {activeView === 'floatingPanel' ? <FloatingPanelPreview /> : activeView === 'viewSettings' ? <SettingsHostProvider value={graphSettingsHost}><ViewSettingsPanel
      contextLabel="Markdown YAML Frontmatter"
      savedViews={savedViews} activeViewId={activeSavedViewId} viewName={savedViewName} layout={savedViewLayout}
      graphEnabled={graphEnabled} rowHeight={rowHeight} fieldLineMode={fieldLineMode}
      onSelectSavedView={selectSavedView} onChangeName={updateSavedViewName} onChangeLayout={updateSavedViewLayout}
      onChangeGraphEnabled={setGraphEnabled} onChangeRowHeight={setRowHeight} onChangeFieldLineMode={setFieldLineMode}
      onDuplicateView={duplicateSavedView} onDeleteView={deleteSavedView}>
      <FieldWorkbench ariaLabel="View field settings" toolbar={<FieldWorkbenchSearch value="" onChange={() => undefined} placeholder="Search properties…" />}
        listLabel="View fields" listSummary="Visible 3 · Total 5"
        listContent={<>{['Name', 'Status', 'Due date'].map(field => <FieldWorkbenchItem key={field} label={field} type={field === 'Due date' ? 'Date' : 'Text'} selected={field === 'Name'} onSelect={() => undefined} />)}</>}
        detailLabel="Field settings" detailContent={<p className="m-0 text-xs">Field types, filters, sort, groups, and date mapping stay in the consumer slot.</p>} />
    </ViewSettingsPanel></SettingsHostProvider> : activeView === 'workflow' ? <WorkflowManagerPreview /> : activeView === 'dashboard' ? <DashboardPreview /> : activeView === 'calendar' ? <CalendarView
      view={view} config={calendarConfig} columnTypesById={{ due: 'date' }} canMutate
      onChangeConfig={setCalendarConfig} onNewRecord={onNewRecord}
      renderRecordDetail={row => <dl className="grid grid-cols-[auto_1fr] gap-2 text-sm">{view.columns.map((column, index) => <React.Fragment key={column.id}><dt>{column.name}</dt><dd>{row.cells[index] || '—'}</dd></React.Fragment>)}</dl>} /> : activeView === 'kanban' ? <>
      <p className="mb-2 text-xs text-[color:var(--kg-text-secondary)]">Select a lane control to edit status, drag a card, or use its menu. No data leaves this browser tab.</p>
      <KanbanHostProvider value={graphHost}><KanbanView view={view} canMutate onUpdateCell={onUpdateCell} onNewRecord={onNewRecord} onReorderRows={onReorderRows} onActivateRow={activateRow} /></KanbanHostProvider>
    </> : <React.Suspense fallback={<p role="status">Loading Table view…</p>}>
      <LazyTablePreview view={view} multiDimensional={activeView === 'multiDimensional'} canMutate onUpdateCell={onUpdateCell} onNewRecord={onNewRecord} selectedRowId={selectedRowId} onActivateRow={activateRow} />
    </React.Suspense>}
    <output className="mt-4 block border-t border-[color:var(--kg-border)] pt-3 text-xs text-[color:var(--kg-text-secondary)]" aria-live="polite">{selected}</output>
  </main>
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><Preview /></React.StrictMode>)
