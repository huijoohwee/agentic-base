import type React from 'react'

export const getKanbanCardDragVisualState = (args: {
  hasActiveDrag: boolean
  isDragging: boolean
  isDropTarget: boolean
  isCommitFlash?: boolean
  indicatorColor: string
}): { className: string; style?: React.CSSProperties } => {
  if (args.isDragging) {
    return {
      className: 'scale-[1.01] -rotate-[1deg] opacity-95 z-20 cursor-grabbing',
      style: {
        borderColor: args.indicatorColor,
        boxShadow: `var(--base-shadow-raised), 0 0 0 1px ${args.indicatorColor}`,
      },
    }
  }
  if (args.isDropTarget) {
    return {
      className: 'translate-y-0',
      style: {
        borderColor: args.indicatorColor,
        boxShadow: `var(--base-shadow-raised), 0 0 0 1px ${args.indicatorColor}`,
      },
    }
  }
  if (args.isCommitFlash) {
    return {
      className: 'translate-y-0',
      style: {
        borderColor: args.indicatorColor,
        boxShadow: `0 0 0 1px ${args.indicatorColor}, 0 0 0 6px ${args.indicatorColor}22`,
      },
    }
  }
  if (args.hasActiveDrag) {
    return {
      className: 'opacity-85 saturate-[0.92]',
    }
  }
  return { className: '' }
}

export const getKanbanLaneDragVisualState = (args: {
  hasActiveDrag: boolean
  isDragOver: boolean
  isSourceLane: boolean
  isCommitFlash?: boolean
  indicatorColor: string
}): { className: string; style?: React.CSSProperties } => {
  if (args.isDragOver) {
    return {
      className: 'shadow-[var(--base-shadow-raised)]',
      style: {
        borderColor: args.indicatorColor,
        boxShadow: `0 0 0 1px ${args.indicatorColor}, var(--base-shadow-raised)`,
      },
    }
  }
  if (args.isCommitFlash) {
    return {
      className: 'shadow-[var(--base-shadow-raised)]',
      style: {
        borderColor: args.indicatorColor,
        boxShadow: `0 0 0 1px ${args.indicatorColor}, 0 0 0 8px ${args.indicatorColor}1f`,
      },
    }
  }
  if (args.isSourceLane) {
    return {
      className: 'shadow-[var(--base-shadow-raised)] opacity-95',
      style: {
        boxShadow: `0 0 0 1px ${args.indicatorColor}66 inset`,
      },
    }
  }
  if (args.hasActiveDrag) {
    return {
      className: 'opacity-90',
    }
  }
  return { className: '', style: undefined }
}
