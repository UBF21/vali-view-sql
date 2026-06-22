// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { play, stop } from '@/lib/sqla/index'
import * as anim from '@/lib/sqla/anim'

vi.mock('@/lib/sqla/anim', () => ({
  go: vi.fn(),
  clearAll: vi.fn(),
  beep: vi.fn(),
  animate: vi.fn(),
}))

beforeEach(() => { vi.clearAllMocks() })
afterEach(() => { document.body.innerHTML = '' })

describe('play()', () => {
  it('agrega overlay al container', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    play(container, { dbType: 'postgresql' })
    expect(container.querySelector('.sqla-overlay')).toBeTruthy()
  })

  it('llama animate con el tema correcto', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    play(container, { dbType: 'mysql', muted: true })
    expect(anim.animate).toHaveBeenCalledOnce()
    const [, theme] = (anim.animate as ReturnType<typeof vi.fn>).mock.calls[0] as [unknown, { color: string }, ...unknown[]]
    expect(theme.color).toBe('#f97316')
  })

  it('reemplaza overlay existente en lugar de acumular', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    play(container, { dbType: 'postgresql' })
    play(container, { dbType: 'postgresql' })
    expect(container.querySelectorAll('.sqla-overlay').length).toBe(1)
  })

  it('inyecta CSS una sola vez', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    play(container)
    play(container)
    expect(document.querySelectorAll('#sqla-css').length).toBe(1)
  })
})

describe('stop()', () => {
  it('llama clearAll y elimina overlays', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    play(container)
    stop()
    expect(anim.clearAll).toHaveBeenCalled()
    expect(document.querySelector('.sqla-overlay')).toBeNull()
  })
})
