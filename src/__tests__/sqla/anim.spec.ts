import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { go, clearAll, beep } from '@/lib/sqla/anim'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { clearAll(); vi.useRealTimers() })

describe('go() / clearAll()', () => {
  it('ejecuta el callback tras el delay', () => {
    const fn = vi.fn()
    go(fn, 100)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledOnce()
  })

  it('clearAll cancela los timeouts pendientes', () => {
    const fn = vi.fn()
    go(fn, 500)
    clearAll()
    vi.advanceTimersByTime(500)
    expect(fn).not.toHaveBeenCalled()
  })

  it('acumula multiples callbacks', () => {
    const fns = [vi.fn(), vi.fn(), vi.fn()]
    fns.forEach((f, i) => go(f, (i + 1) * 100))
    vi.advanceTimersByTime(300)
    fns.forEach(f => expect(f).toHaveBeenCalledOnce())
  })
})

describe('beep()', () => {
  it('no lanza con muted=true', () => {
    expect(() => beep(true)).not.toThrow()
  })

  it('no lanza cuando AudioContext no esta disponible', () => {
    expect(() => beep(false, 440, 0.1, 0.01)).not.toThrow()
  })
})
