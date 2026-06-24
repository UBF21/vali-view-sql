export interface DropdownRect {
  top: number
  left: number
  width: number
  maxHeight: number
}

export function computeDropdownRect(
  buttonRect: DOMRect,
  menuWidth: number,
  menuMaxH: number,
): DropdownRect {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const w = Math.min(menuWidth, vw - 16)
  const left = Math.max(8, Math.min(buttonRect.left, vw - w - 8))
  const maxHeight = Math.max(0, Math.min(menuMaxH, vh - buttonRect.bottom - 12))
  return { top: buttonRect.bottom + 4, left, width: w, maxHeight }
}
