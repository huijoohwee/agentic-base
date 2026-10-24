export type DataViewDensityPreset = 'compact' | 'comfortable'

export const AGENTIC_BASE_DATA_VIEW_ROW_HEIGHT_PX: Readonly<Record<DataViewDensityPreset, number>> = Object.freeze({
  compact: 38,
  comfortable: 44,
})

export function readBaseDataViewRowHeightPx(preset: DataViewDensityPreset): number {
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
