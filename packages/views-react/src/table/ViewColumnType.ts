export type ViewColumnKind = 'text' | 'select' | 'multi-select'

export type ViewColumnType =
  | 'checkbox'
  | 'date'
  | 'multi-select'
  | 'number'
  | 'progress'
  | 'select'
  | 'link'
  | 'geodata'
  | 'text'
  | 'created-time'
  | 'attachment'
  | 'member'
  | 'created-by'

export type ViewColumnTypeOption = { key: ViewColumnType; label: string }

export const VIEW_COLUMN_TYPE_OPTIONS: readonly ViewColumnTypeOption[] = [
  { key: 'checkbox', label: 'Checkbox' },
  { key: 'date', label: 'Date' },
  { key: 'multi-select', label: 'Multi-select' },
  { key: 'number', label: 'Number' },
  { key: 'progress', label: 'Progress' },
  { key: 'select', label: 'Select' },
  { key: 'link', label: 'Link' },
  { key: 'geodata', label: 'Geodata' },
  { key: 'text', label: 'Text' },
  { key: 'created-time', label: 'Created Time' },
  { key: 'attachment', label: 'Attachment' },
  { key: 'member', label: 'Member' },
  { key: 'created-by', label: 'Created By' },
]

export function labelForViewColumnType(type: ViewColumnType): string {
  return VIEW_COLUMN_TYPE_OPTIONS.find(option => option.key === type)?.label || 'Text'
}

export function defaultColumnTypeForInferredKind(kind: ViewColumnKind): ViewColumnType {
  if (kind === 'multi-select') return 'multi-select'
  if (kind === 'select') return 'select'
  return 'text'
}

export function columnTypeToBaseKind(type: ViewColumnType): ViewColumnKind {
  if (type === 'multi-select') return 'multi-select'
  if (type === 'select' || type === 'checkbox') return 'select'
  return 'text'
}
