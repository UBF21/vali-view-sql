import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { computeDropdownRect } from './dropdown-rect'

function makeRect(overrides: Partial<DOMRect> = {}): DOMRect {
  return {
    top: 0, left: 0, bottom: 40, right: 100,
    width: 100, height: 40, x: 0, y: 0,
    toJSON: () => ({}),
    ...overrides,
  } as DOMRect
}

describe('computeDropdownRect', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { innerWidth: 1024, innerHeight: 768 })
  })
  afterEach(() => { vi.unstubAllGlobals() })

  it('retorna top = buttonRect.bottom + 4', () => {
    const r = computeDropdownRect(makeRect({ bottom: 50 }), 300, 400)
    expect(r.top).toBe(54)
  })

  it('usa el menuWidth cuando cabe en el viewport', () => {
    const r = computeDropdownRect(makeRect({ left: 100 }), 300, 400)
    expect(r.width).toBe(300)
  })

  it('recorta el ancho cuando menuWidth > viewport - 16', () => {
    vi.stubGlobal('window', { innerWidth: 320, innerHeight: 568 })
    const r = computeDropdownRect(makeRect({ left: 0 }), 400, 400)
    expect(r.width).toBe(304) // 320 - 16
  })

  it('usa left = buttonRect.left cuando cabe', () => {
    const r = computeDropdownRect(makeRect({ left: 100 }), 300, 400)
    expect(r.left).toBe(100)
  })

  it('clampea left para no salirse por la derecha', () => {
    vi.stubGlobal('window', { innerWidth: 375, innerHeight: 667 })
    const r = computeDropdownRect(makeRect({ left: 200 }), 260, 400)
    expect(r.left).toBe(375 - 260 - 8) // = 107
  })

  it('recorta maxHeight para no salirse por abajo', () => {
    vi.stubGlobal('window', { innerWidth: 1024, innerHeight: 400 })
    const r = computeDropdownRect(makeRect({ bottom: 350 }), 300, 400)
    expect(r.maxHeight).toBe(38) // 400 - 350 - 12
  })

  it('usa menuMaxH cuando hay espacio suficiente', () => {
    const r = computeDropdownRect(makeRect({ bottom: 40 }), 300, 380)
    expect(r.maxHeight).toBe(380) // 768 - 40 - 12 = 716 > 380
  })

  it('left mínimo 8px (nunca sale por la izquierda)', () => {
    vi.stubGlobal('window', { innerWidth: 375, innerHeight: 667 })
    const r = computeDropdownRect(makeRect({ left: 2 }), 400, 400)
    expect(r.left).toBeGreaterThanOrEqual(8)
  })

  it('maxHeight nunca es negativo cuando el botón está cerca del borde inferior', () => {
    vi.stubGlobal('window', { innerWidth: 1024, innerHeight: 100 })
    const r = computeDropdownRect(makeRect({ bottom: 95 }), 300, 400)
    expect(r.maxHeight).toBeGreaterThanOrEqual(0)
  })
})
