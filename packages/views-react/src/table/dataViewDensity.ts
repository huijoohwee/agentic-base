import sharedUiPin from '../browser/shared-ui-profile.pin.json'

export type DataViewDensityPreset = 'compact' | 'comfortable'

export const AGENTIC_BASE_DATA_VIEW_ROW_HEIGHT_PX: Readonly<Record<DataViewDensityPreset, number>> = Object.freeze({
  compact: sharedUiPin.metrics.rowHeight,
  comfortable: sharedUiPin.metrics.rowHeight,
})

export function readBaseDataViewRowHeightPx(preset: DataViewDensityPreset): number {
  if (typeof document !== 'undefined') {
    const value = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--agentic-row-height'))
    if (Number.isFinite(value) && value > 0) return value
  }
  return AGENTIC_BASE_DATA_VIEW_ROW_HEIGHT_PX[preset]
}

export function readBaseDataViewDensityClassName(preset: DataViewDensityPreset): string {
  return `agentic-base-data-density-${preset}`
}

export function readBaseDataViewHeaderPaddingClassName(preset: DataViewDensityPreset): string {
  return readBaseDataViewDensityClassName(preset)
}

export function readBaseDataViewCellPaddingClassName(preset: DataViewDensityPreset): string {
  return readBaseDataViewDensityClassName(preset)
}
