import React from 'react'
import { DashboardBarChart, DashboardLineAreaChart, DASHBOARD_CHART_TONE_COLORS } from '../dashboard/DashboardCharts'
import type { DashboardSeriesPoint, DashboardTone } from '../dashboard/dashboardTypes'
import { mountBrowserView } from './mountBrowserView'

export type DashboardChartState = {
  type: 'line' | 'area' | 'column'
  series: readonly DashboardSeriesPoint[]
  tone: DashboardTone
  gridEnabled: boolean
}

function snapshot(state: DashboardChartState): DashboardChartState {
  if (!state || !['line', 'area', 'column'].includes(state.type) || !Object.hasOwn(DASHBOARD_CHART_TONE_COLORS, state.tone)
    || typeof state.gridEnabled !== 'boolean' || !Array.isArray(state.series) || !state.series.length || state.series.length > 1000)
    throw new TypeError('Invalid dashboard chart settings or series length.')
  const labels = new Set<string>()
  const series = state.series.map(({ label, tickLabel, value, detail }) => {
    if (typeof label !== 'string' || !label.trim() || label.length > 256 || labels.has(label) || !Number.isFinite(value)
      || (tickLabel !== undefined && (typeof tickLabel !== 'string' || tickLabel.length > 256))
      || (detail !== undefined && (typeof detail !== 'string' || detail.length > 4096))) throw new TypeError('Invalid dashboard chart point.')
    labels.add(label)
    return { label, tickLabel, value, detail }
  })
  return { ...state, series }
}

/** Use the same chart renderers in Graph's dashboard and a plain browser host. */
export function mountDashboardChart(target: HTMLElement, initial: DashboardChartState) {
  return mountBrowserView(target, initial, snapshot, ({ type, series, tone, gridEnabled }) =>
    type === 'column' ? <DashboardBarChart {...{ series, tone, gridEnabled }} />
      : <DashboardLineAreaChart {...{ series, tone, gridEnabled }} area={type === 'area'} />)
}
