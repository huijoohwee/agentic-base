import React from 'react'
import * as d3 from 'd3'
import Tooltip from 'agentic-design-system/react/hover'
import { HOVER_PARTS, buildHoverKeyValueText } from 'agentic-design-system/hover/text'
import type { DashboardSeriesPoint, DashboardTone } from './dashboardTypes'

const CHART_WIDTH = 360
const CHART_HEIGHT = 178
const CHART_PADDING = { top: 18, right: 18, bottom: 28, left: 34 }
type DashboardChartTooltipState = {
  point: DashboardSeriesPoint
  anchor: SVGElement
  x: number
  y: number
}

export const DASHBOARD_CHART_TONE_COLORS: Record<DashboardTone, { stroke: string; fill: string; bar: string }> = {
  blue: {
    stroke: '#2563eb',
    fill: 'rgba(37, 99, 235, 0.16)',
    bar: '#3b82f6',
  },
  green: {
    stroke: '#047857',
    fill: 'rgba(4, 120, 87, 0.16)',
    bar: '#10b981',
  },
  amber: {
    stroke: '#b45309',
    fill: 'rgba(180, 83, 9, 0.16)',
    bar: '#f59e0b',
  },
  rose: {
    stroke: '#be123c',
    fill: 'rgba(190, 18, 60, 0.14)',
    bar: '#f43f5e',
  },
  slate: {
    stroke: '#475569',
    fill: 'rgba(71, 85, 105, 0.12)',
    bar: '#64748b',
  },
}

const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) return '0'
  if (Math.abs(value) >= 1000) return d3.format('~s')(value)
  if (Math.abs(value) >= 10) return d3.format(',.0f')(value)
  return d3.format(',.2~f')(value)
}

const clampLabel = (label: string): string => {
  if (label.length <= 14) return label
  return `${label.slice(0, 13)}…`
}

function DashboardChartTooltipOverlay({ tooltip }: { tooltip: DashboardChartTooltipState | null }) {
  if (!tooltip) return null
  return <Tooltip anchorElement={tooltip.anchor} open interactive={false} content={<>
    <div className={HOVER_PARTS.label}>{tooltip.point.label}</div>
    <div className={HOVER_PARTS.value}>{formatNumber(tooltip.point.value)}</div>
    {tooltip.point.detail ? <div className={HOVER_PARTS.text}>{tooltip.point.detail}</div> : null}
  </>} />
}

const readYDomain = (series: readonly DashboardSeriesPoint[]): [number, number] => {
  const values = series.map(point => point.value).filter(Number.isFinite)
  const max = Math.max(1, d3.max(values) ?? 1)
  const min = Math.min(0, d3.min(values) ?? 0)
  return [min, max]
}

function ChartGridLines(props: {
  y: d3.ScaleLinear<number, number>
  gridEnabled: boolean
}) {
  if (!props.gridEnabled) return null
  const ticks = props.y.ticks(4)
  return (
    <g aria-hidden="true">
      {ticks.map(tick => (
        <line
          key={tick}
          x1={CHART_PADDING.left}
          x2={CHART_WIDTH - CHART_PADDING.right}
          y1={props.y(tick)}
          y2={props.y(tick)}
          stroke="var(--agentic-base-dashboard-border, #d1d5db)"
          strokeOpacity={0.62}
          strokeWidth={0.8}
        />
      ))}
    </g>
  )
}

export function DashboardLineAreaChart(props: {
  series: readonly DashboardSeriesPoint[]
  tone: DashboardTone
  gridEnabled: boolean
  area?: boolean
}) {
  const series = props.series.length ? props.series : [{ label: '0', value: 0 }]
  const [tooltip, setTooltip] = React.useState<DashboardChartTooltipState | null>(null)
  const x = d3
    .scaleLinear()
    .domain([0, Math.max(1, series.length - 1)])
    .range([CHART_PADDING.left, CHART_WIDTH - CHART_PADDING.right])
  const y = d3
    .scaleLinear()
    .domain(readYDomain(series))
    .nice()
    .range([CHART_HEIGHT - CHART_PADDING.bottom, CHART_PADDING.top])
  const linePath = d3
    .line<DashboardSeriesPoint>()
    .x((_, index) => x(index))
    .y(point => y(point.value))
    .curve(d3.curveMonotoneX)(series) || ''
  const areaPath = d3
    .area<DashboardSeriesPoint>()
    .x((_, index) => x(index))
    .y0(y(0))
    .y1(point => y(point.value))
    .curve(d3.curveMonotoneX)(series) || ''
  const colors = DASHBOARD_CHART_TONE_COLORS[props.tone]
  const hitStep = series.length > 1
    ? Math.abs(x(1) - x(0))
    : CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right
  const hitWidth = Math.max(22, hitStep)
  const readTooltip = (point: DashboardSeriesPoint, index: number, anchor: SVGElement): DashboardChartTooltipState => ({
    point, anchor,
    x: x(index),
    y: y(point.value),
  })
  const showTooltip = (point: DashboardSeriesPoint, index: number, anchor: SVGElement) => {
    setTooltip(current => current?.point === point ? current : readTooltip(point, index, anchor))
  }

  return (
    <svg
      className="h-full w-full overflow-visible"
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      role="img"
      aria-label="Dashboard line chart"
      onMouseLeave={() => setTooltip(null)}
      onKeyDown={event => { if (event.key === 'Escape') setTooltip(null) }}
    >
      <ChartGridLines y={y} gridEnabled={props.gridEnabled} />
      {props.area ? <path d={areaPath} fill={colors.fill} /> : null}
      <path d={linePath} fill="none" stroke={colors.stroke} strokeWidth={2.4} strokeLinecap="round" />
      {tooltip ? (
        <line
          x1={tooltip.x}
          x2={tooltip.x}
          y1={CHART_PADDING.top}
          y2={CHART_HEIGHT - CHART_PADDING.bottom}
          stroke={colors.stroke}
          strokeOpacity={0.42}
          strokeDasharray="3 3"
          data-agentic-base-dashboard-chart-hover-line="1"
          aria-hidden="true"
        />
      ) : null}
      {series.map((point, index) => (
        <circle
          key={`${point.label}:${index}`}
          cx={x(index)}
          cy={y(point.value)}
          r={tooltip?.point === point ? 4 : 2.8}
          fill={colors.stroke}
        />
      ))}
      {series.map((point, index) => (
        <rect
          key={`hit:${point.label}:${index}`}
          x={Math.max(CHART_PADDING.left, x(index) - hitWidth / 2)}
          y={CHART_PADDING.top}
          width={Math.min(hitWidth, CHART_WIDTH - CHART_PADDING.right - Math.max(CHART_PADDING.left, x(index) - hitWidth / 2))}
          height={CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom}
          fill="transparent"
          tabIndex={0}
          role="button"
          aria-label={buildHoverKeyValueText(point.label, formatNumber(point.value)) + (point.detail ? `, ${point.detail}` : '')}
          data-agentic-base-dashboard-chart-hit="1"
          onMouseEnter={event => showTooltip(point, index, event.currentTarget)}
          onMouseMove={event => showTooltip(point, index, event.currentTarget)}
          onFocus={event => showTooltip(point, index, event.currentTarget)}
          onBlur={() => setTooltip(null)}
        />
      ))}
      {series.slice(0, 1).map(point => (
        <text key="start" x={CHART_PADDING.left} y={CHART_HEIGHT - 8} fill="var(--agentic-base-dashboard-text-tertiary, #6b7280)" fontSize="10">
          {clampLabel(point.label)}
        </text>
      ))}
      {series.slice(-1).map(point => (
        <text key="end" x={CHART_WIDTH - CHART_PADDING.right} y={CHART_HEIGHT - 8} textAnchor="end" fill="var(--agentic-base-dashboard-text-tertiary, #6b7280)" fontSize="10">
          {clampLabel(point.label)}
        </text>
      ))}
      <DashboardChartTooltipOverlay tooltip={tooltip} />
    </svg>
  )
}

export function DashboardBarChart(props: {
  series: readonly DashboardSeriesPoint[]
  tone: DashboardTone
  gridEnabled: boolean
}) {
  const series = props.series.length ? props.series : [{ label: '0', value: 0 }]
  const [tooltip, setTooltip] = React.useState<DashboardChartTooltipState | null>(null)
  const x = d3
    .scaleBand<string>()
    .domain(series.map(point => point.label))
    .range([CHART_PADDING.left, CHART_WIDTH - CHART_PADDING.right])
    .padding(0.24)
  const y = d3
    .scaleLinear()
    .domain(readYDomain(series))
    .nice()
    .range([CHART_HEIGHT - CHART_PADDING.bottom, CHART_PADDING.top])
  const colors = DASHBOARD_CHART_TONE_COLORS[props.tone]
  const zeroY = y(0)

  return (
    <svg
      className="h-full w-full overflow-visible"
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      role="img"
      aria-label="Dashboard bar chart"
      onMouseLeave={() => setTooltip(null)}
      onKeyDown={event => { if (event.key === 'Escape') setTooltip(null) }}
    >
      <ChartGridLines y={y} gridEnabled={props.gridEnabled} />
      {series.map(point => {
        const xPos = x(point.label) ?? CHART_PADDING.left
        const yValue = y(point.value)
        const yPos = y(Math.max(0, point.value))
        const height = Math.max(2, Math.abs(zeroY - yPos))
        const showTooltip = (event: React.MouseEvent<SVGGElement> | React.FocusEvent<SVGGElement>) => {
          const tooltipState = {
            point, anchor: event.currentTarget,
            x: xPos + x.bandwidth() / 2,
            y: Math.min(zeroY, yValue),
          } satisfies DashboardChartTooltipState
          setTooltip(current => current?.point === point ? current : tooltipState)
        }
        return (
          <g
            key={point.label}
            tabIndex={0}
            role="button"
            aria-label={buildHoverKeyValueText(point.label, formatNumber(point.value)) + (point.detail ? `, ${point.detail}` : '')}
            data-agentic-base-dashboard-chart-hit="1"
            onMouseEnter={showTooltip}
            onMouseMove={showTooltip}
            onFocus={showTooltip}
            onBlur={() => setTooltip(null)}
          >
            <rect x={xPos} y={Math.min(zeroY, yPos)} width={x.bandwidth()} height={height} rx={4} fill={colors.bar} />
            <rect
              x={xPos}
              y={CHART_PADDING.top}
              width={x.bandwidth()}
              height={CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom}
              fill="transparent"
              aria-hidden="true"
            />
            <text x={xPos + x.bandwidth() / 2} y={CHART_HEIGHT - 8} textAnchor="middle" fill="var(--agentic-base-dashboard-text-tertiary, #6b7280)" fontSize="9">
              {clampLabel(point.label)}
            </text>
          </g>
        )
      })}
      <DashboardChartTooltipOverlay tooltip={tooltip} />
    </svg>
  )
}
