// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from '@/hooks/useIsMobile'

// Helper to mock window.matchMedia
function mockMatchMedia(matches: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = []
  const mql = {
    matches,
    addEventListener: vi.fn((_: string, handler: (e: MediaQueryListEvent) => void) => {
      listeners.push(handler)
    }),
    removeEventListener: vi.fn((_: string, handler: (e: MediaQueryListEvent) => void) => {
      const idx = listeners.indexOf(handler)
      if (idx !== -1) listeners.splice(idx, 1)
    }),
    dispatchChange: (newMatches: boolean) => {
      listeners.forEach(fn => fn({ matches: newMatches } as MediaQueryListEvent))
    },
  }
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn(() => mql),
  })
  return mql
}

describe('useIsMobile', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns true when window width is <= breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 })
    const mql = mockMatchMedia(true)
    const { result } = renderHook(() => useIsMobile(768))
    expect(result.current).toBe(true)
    mql // suppress unused warning
  })

  it('returns false when window width is > breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 })
    const mql = mockMatchMedia(false)
    const { result } = renderHook(() => useIsMobile(768))
    expect(result.current).toBe(false)
    mql
  })

  it('updates value when media query changes', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 })
    const mql = mockMatchMedia(false)
    const { result } = renderHook(() => useIsMobile(768))
    expect(result.current).toBe(false)

    act(() => {
      mql.dispatchChange(true)
    })
    expect(result.current).toBe(true)
  })

  it('uses 768 as default breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 400 })
    mockMatchMedia(true)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('removes event listener on unmount', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 400 })
    const mql = mockMatchMedia(true)
    const { unmount } = renderHook(() => useIsMobile(768))
    unmount()
    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})
