export type DashboardTone = 'blue' | 'green' | 'amber' | 'rose' | 'slate'

export type DashboardSeriesPoint = {
  label: string
  tickLabel?: string
  value: number
  detail?: string
}
