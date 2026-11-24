import React from 'react'

/** A comma-separated list of literals. Keep separators outside code for selection and copying. */
export function InlineCodeList({ value, className }: { value: string; className?: string }) {
  return <span className={className}>{value.split(/(,\s*)/u).map((part, index) =>
    index % 2 || !part ? part : <code key={index} className="agentic-base-inline-code">{part}</code>
  )}</span>
}
