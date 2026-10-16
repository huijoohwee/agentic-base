import React from 'react'
import type { ReactNode } from 'react'
import type { ViewModel, ViewRow } from '../kanban/KanbanHostContext'
import { dayInCalendarTimeZone, isValidCalendarTimeZone, parseCalendarDate } from './dates'
import { CALENDAR_DAY_PREVIEW_SIZE, CALENDAR_PAGE_SIZE, calendarDateLabel, calendarMonthDays, projectCalendarView, shiftCalendarMonth, visibleCalendarDays, type CalendarConfig } from './calendarProjection'
import './calendar.css'

export type CalendarViewProps = {
  view: ViewModel
  config: CalendarConfig
  columnTypesById?: Record<string, string> | null
  canMutate: boolean
  onChangeConfig: (config: CalendarConfig) => void
  onNewRecord?: (seed?: Partial<Record<string, string>>) => void
  renderRecordDetail?: (row: ViewRow) => ReactNode
  actionClassName?: string
  inputClassName?: string
}

const actionClass = 'base-calendar-action inline-flex min-h-10 items-center justify-center rounded border px-2 py-1 text-sm'
const inputClass = 'base-calendar-input min-h-10 min-w-0 rounded border px-2 py-1'
const weekdays = Array.from({ length: 7 }, (_, index) => {
  const date = `2024-01-${String(index + 7).padStart(2, '0')}`
  return {
    short: calendarDateLabel(date, { weekday: 'short' }),
    full: calendarDateLabel(date, { weekday: 'long' }),
  }
})

export function moveCalendarDayFocus(event: React.KeyboardEvent<HTMLButtonElement>) {
  const buttons = Array.from(event.currentTarget.closest('table')?.querySelectorAll<HTMLButtonElement>('button[data-calendar-date]') ?? [])
  const index = buttons.indexOf(event.currentTarget)
  const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -(index % 7), End: 6 - (index % 7) }[event.key]
  if (delta === undefined || event.altKey || event.ctrlKey || event.metaKey) return
  event.preventDefault()
  buttons[Math.max(0, Math.min(buttons.length - 1, index + delta))]?.focus()
}

export const CalendarView = React.memo(function CalendarView(props: CalendarViewProps) {
  const { view, config } = props
  const projection = React.useMemo(() => {
    const result = projectCalendarView(view, config)
    const validType = (id: string | null) => !id || ['date', 'created-time'].includes(props.columnTypesById?.[id] ?? 'date')
    if (validType(config.startColumnId) && validType(config.endColumnId)) return result
    return {
      ...result,
      days: result.days.map(day => ({ ...day, rows: [] })),
      unscheduled: [],
      invalid: view.rows.map(row => ({ row, reason: 'Calendar properties must have a Date or Created Time type.' })),
      error: 'Choose Date or Created Time properties in Calendar settings.',
    }
  }, [props.columnTypesById, view, config])
  const [selectedDay, setSelectedDay] = React.useState<string | null>(null)
  const [creatingDay, setCreatingDay] = React.useState<string | null>(null)
  const [selectedRowId, setSelectedRowId] = React.useState<string | null>(null)
  const [pages, setPages] = React.useState<Record<string, number>>({})
  const [recordTitle, setRecordTitle] = React.useState('')
  const dialog = React.useRef<HTMLDialogElement>(null)
  const composer = React.useRef<HTMLFormElement>(null)
  const agenda = React.useRef<HTMLElement>(null)
  const monthPicker = React.useRef<HTMLDetailsElement>(null)
  const titleIndex = view.columns.findIndex(column => column.id === view.titleColumnId)
  const selectedRow = view.rows.find(row => row.id === selectedRowId)
  const titleFor = (row: ViewRow) => String(row.cells[titleIndex] ?? '').trim() || 'Untitled'
  const days = visibleCalendarDays(projection.days)
  const today = isValidCalendarTimeZone(config.timeZone) ? dayInCalendarTimeZone(Date.now(), config.timeZone) : ''
  const canCreateDate = props.canMutate && Boolean(config.startColumnId) && Boolean(props.onNewRecord)
    && (!props.columnTypesById || props.columnTypesById[config.startColumnId ?? ''] === 'date')

  React.useEffect(() => { setPages({}) }, [config.month, view])
  React.useEffect(() => { composer.current?.querySelector('input')?.focus() }, [creatingDay])
  React.useEffect(() => {
    const current = dialog.current
    if (!current) return
    if (selectedRow && !current.open) current.showModal()
    else if ((!selectedRow || !props.renderRecordDetail) && current.open) current.close()
  }, [props.renderRecordDetail, selectedRow])

  const selectDay = (day: string) => { setSelectedDay(day); setCreatingDay(null) }
  const chooseCalendarDate = (day: string) => {
    if (!day.startsWith(config.month)) props.onChangeConfig({ ...config, month: day.slice(0, 7) })
    selectDay(day)
    if (monthPicker.current) {
      monthPicker.current.open = false
      monthPicker.current.querySelector('summary')?.focus()
    }
  }
  const changeMonth = (month: string) => {
    if (!calendarMonthDays(month).length) return
    setCreatingDay(null)
    setSelectedDay(null)
    props.onChangeConfig({ ...config, month })
  }
  const createOnDay = (day: string) => { setCreatingDay(day); setRecordTitle('') }
  const closeComposer = () => {
    const form = composer.current
    setCreatingDay(null)
    form?.closest('td')?.querySelector<HTMLButtonElement>('.base-calendar-date')?.focus()
  }
  const recordButton = (row: ViewRow) => <li key={row.id} className="list-none min-w-0">
    <button type="button" className="base-calendar-record" aria-pressed={selectedRowId === row.id}
      aria-haspopup={props.renderRecordDetail ? 'dialog' : undefined} aria-label={`Open record: ${titleFor(row)}`}
      title={titleFor(row)} onClick={() => {
        setSelectedRowId(row.id)
      }}>{titleFor(row)}</button>
  </li>
  const pagedList = (rows: ViewRow[], key: string) => {
    const page = Math.min(pages[key] ?? 0, Math.max(0, Math.ceil(rows.length / CALENDAR_PAGE_SIZE) - 1))
    return <>
      <ol className="m-0 space-y-1 p-0" aria-label={`Records for ${key}`}>
        {rows.slice(page * CALENDAR_PAGE_SIZE, (page + 1) * CALENDAR_PAGE_SIZE).map(recordButton)}
      </ol>
      {rows.length > CALENDAR_PAGE_SIZE && <nav className="flex flex-wrap items-center gap-1" aria-label={`Record pages for ${key}`}>
        <button type="button" className={props.actionClassName ?? actionClass} disabled={!page}
          onClick={() => setPages(previous => ({ ...previous, [key]: page - 1 }))}>Previous</button>
        <output className="text-xs">{page * CALENDAR_PAGE_SIZE + 1}–{Math.min(rows.length, (page + 1) * CALENDAR_PAGE_SIZE)} of {rows.length}</output>
        <button type="button" className={props.actionClassName ?? actionClass} disabled={(page + 1) * CALENDAR_PAGE_SIZE >= rows.length}
          onClick={() => setPages(previous => ({ ...previous, [key]: page + 1 }))}>Next</button>
      </nav>}
    </>
  }
  const dayComposer = (day: string) => <form ref={composer} aria-label={`New record on ${day}`} className="base-calendar-composer"
    onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); closeComposer() } }}
    onSubmit={event => {
      event.preventDefault()
      if (!canCreateDate || !config.startColumnId) return
      props.onNewRecord?.({ [view.titleColumnId]: recordTitle.trim() || 'Untitled', [config.startColumnId]: day })
      closeComposer()
    }}>
    <label>Record title<input className={props.inputClassName ?? inputClass} aria-label={`New record title on ${day}`}
      placeholder="Untitled" value={recordTitle} onChange={event => setRecordTitle(event.target.value)} /></label>
    <button type="submit" className={props.actionClassName ?? actionClass}>Add record</button>
    <button type="button" className={props.actionClassName ?? actionClass} onClick={closeComposer}>Cancel</button>
  </form>

  return <section aria-label="Calendar view" className="base-data-calendar min-w-0 space-y-3 p-2">
    <header className="base-calendar-navigation">
      <details ref={monthPicker} className="base-calendar-navigator" onKeyDown={event => {
        if (event.key === 'Escape' && monthPicker.current?.open) {
          event.preventDefault(); monthPicker.current.open = false; monthPicker.current.querySelector('summary')?.focus()
        }
      }}>
        <summary role="button" className="base-calendar-month-title" aria-label={`Choose date, ${config.month}`}>
          {calendarDateLabel(`${config.month}-01`, { month: 'long', year: 'numeric' })}
        </summary>
        <section aria-label="Date navigator" className="base-calendar-date-picker">
          <label className="text-xs">Month<input className={props.inputClassName ?? inputClass} aria-label="Calendar month" type="month"
            value={config.month} onChange={event => changeMonth(event.target.value)} /></label>
          <table aria-label={`Date navigator ${config.month}`}><thead><tr>{weekdays.map(day => <th key={day.full} scope="col"><abbr title={day.full}>{day.short}</abbr></th>)}</tr></thead>
            <tbody>{Array.from({ length: days.length / 7 }, (_, week) => <tr key={week}>{days.slice(week * 7, week * 7 + 7).map(day => <td key={day.date}>
              <button type="button" disabled={!parseCalendarDate(day.date)} data-calendar-date={day.date} data-outside={!day.inMonth}
                aria-label={`Go to ${day.date}`} aria-current={today === day.date ? 'date' : undefined} aria-pressed={selectedDay === day.date}
                onKeyDown={moveCalendarDayFocus} onClick={() => chooseCalendarDate(day.date)}><time dateTime={day.date}>{Number(day.date.slice(-2))}</time></button>
            </td>)}</tr>)}</tbody>
          </table>
          <button type="button" className={props.actionClassName ?? actionClass} disabled={!today} onClick={() => chooseCalendarDate(today)}>Go to today</button>
        </section>
      </details>
      <nav aria-label="Calendar navigation" className="flex items-center gap-1">
        <button type="button" className={props.actionClassName ?? actionClass} aria-label="Previous month"
          disabled={shiftCalendarMonth(config.month, -1) === config.month} onClick={() => changeMonth(shiftCalendarMonth(config.month, -1))}>‹</button>
        <button type="button" className={props.actionClassName ?? actionClass} disabled={!today} onClick={() => chooseCalendarDate(today)}>Today</button>
        <button type="button" className={props.actionClassName ?? actionClass} aria-label="Next month"
          disabled={shiftCalendarMonth(config.month, 1) === config.month} onClick={() => changeMonth(shiftCalendarMonth(config.month, 1))}>›</button>
      </nav>
      <output aria-label="Display timezone" className="text-xs">{config.timeZone}</output>
    </header>
    {!config.startColumnId && <p role="status">Choose Calendar by in View settings to place records by date.</p>}
    {projection.error && <p role="alert">{projection.error}</p>}
    <section className="overflow-x-auto" aria-label="Month days">
      <table className="base-calendar-month-grid" aria-label={`Calendar ${config.month}`}>
        <thead><tr>{weekdays.map(day => <th key={day.full} scope="col"><abbr title={day.full}>{day.short}</abbr></th>)}</tr></thead>
        <tbody>{Array.from({ length: days.length / 7 }, (_, week) => <tr key={week}>{days.slice(week * 7, week * 7 + 7).map(day => <td key={day.date} className="base-calendar-day" data-today={today === day.date} data-outside={!day.inMonth}>
          <section aria-label={calendarDateLabel(day.date, { dateStyle: 'full' })}>
            <button type="button" disabled={!parseCalendarDate(day.date)} className="base-calendar-date" data-calendar-date={day.date} data-outside={!day.inMonth}
              aria-current={today === day.date ? 'date' : undefined} aria-label={`Select day ${day.date}, ${day.rows.length} records`}
              aria-pressed={selectedDay === day.date} onKeyDown={moveCalendarDayFocus} onClick={() => selectDay(day.date)}><time dateTime={day.date}>{Number(day.date.slice(-2))}</time></button>
            <ol className="m-0 space-y-1 p-0" aria-label={`Day preview ${day.date}`}>{day.rows.slice(0, CALENDAR_DAY_PREVIEW_SIZE).map(recordButton)}</ol>
            {day.rows.length > CALENDAR_DAY_PREVIEW_SIZE && <button type="button" className="base-calendar-more" aria-label={`Show all ${day.rows.length} records on ${day.date}`}
              onClick={() => { selectDay(day.date); requestAnimationFrame(() => { agenda.current?.focus(); agenda.current?.scrollIntoView?.({ block: 'nearest' }) }) }}>+{day.rows.length - CALENDAR_DAY_PREVIEW_SIZE} more</button>}
            {canCreateDate && parseCalendarDate(day.date) && (creatingDay === day.date ? dayComposer(day.date)
              : <button type="button" className="base-calendar-new-row" aria-label={`New record on ${day.date}`} onClick={() => createOnDay(day.date)}>+ New record</button>)}
          </section>
        </td>)}</tr>)}</tbody>
      </table>
    </section>
    {selectedDay && <aside ref={agenda} tabIndex={-1} aria-label={`Selected day ${selectedDay}`} className="base-calendar-day-agenda space-y-2">
      <header className="flex items-center justify-between gap-2"><h3>{calendarDateLabel(selectedDay, { dateStyle: 'full' })}</h3>
        <button type="button" className={props.actionClassName ?? actionClass} onClick={() => setSelectedDay(null)}>Close day</button></header>
      {pagedList(projection.days.find(day => day.date === selectedDay)?.rows ?? [], `selected ${selectedDay}`)}
      {!projection.days.find(day => day.date === selectedDay)?.rows.length && <p className="text-xs">No records on this day.</p>}
      {canCreateDate && <button type="button" className={props.actionClassName ?? actionClass} onClick={() => { createOnDay(selectedDay); setSelectedDay(null) }}>New record on {selectedDay}</button>}
    </aside>}
    <details><summary className="cursor-pointer p-2">Unscheduled ({projection.unscheduled.length})</summary>{pagedList(projection.unscheduled, 'Unscheduled')}</details>
    <details><summary className="cursor-pointer p-2">Invalid dates ({projection.invalid.length})</summary>
      <p className="text-xs">Use valid YYYY-MM-DD dates or timestamps with offsets. End must follow start using the same format.</p>
      {pagedList(projection.invalid.map(entry => entry.row), 'Invalid dates')}</details>
    <dialog ref={dialog} onCancel={() => setSelectedRowId(null)} onClose={() => setSelectedRowId(null)}
      className="base-calendar-record-dialog rounded border p-3" aria-label="Record details">
      <header className="mb-2 flex items-center justify-between gap-2"><h3 className="min-w-0 break-words">{selectedRow ? titleFor(selectedRow) : 'Record details'}</h3>
        <button type="button" className={props.actionClassName ?? actionClass} aria-label="Close record" onClick={() => setSelectedRowId(null)}>Close</button></header>
      {selectedRow && props.renderRecordDetail?.(selectedRow)}
    </dialog>
  </section>
})
