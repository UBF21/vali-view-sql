// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRef } from 'react'
import { useSQLParseAnim } from '@/hooks/useSQLParseAnim'

vi.mock('@/lib/sqla', () => ({
  play: vi.fn(),
  stop: vi.fn(),
}))

const mockStore = {
  isLoading: false,
  dialect: 'postgresql' as const,
  theme: 'dark' as const,
}
vi.mock('@/store/useAppStore', () => ({
  useAppStore: (sel: (s: typeof mockStore) => unknown) => sel(mockStore),
}))

import * as sqla from '@/lib/sqla'

beforeEach(() => {
  vi.clearAllMocks()
  mockStore.isLoading = false
  mockStore.dialect = 'postgresql'
  mockStore.theme = 'dark'
})

describe('useSQLParseAnim', () => {
  it('devuelve isAnimating=false inicialmente', () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(document.createElement('div'))
      return useSQLParseAnim(ref)
    })
    expect(result.current.isAnimating).toBe(false)
  })

  it('llama play cuando isLoading pasa de false a true', async () => {
    const container = document.createElement('div')
    const { rerender } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(container)
      return useSQLParseAnim(ref)
    })
    mockStore.isLoading = true
    await act(async () => { rerender() })
    expect(sqla.play).toHaveBeenCalledOnce()
    expect(sqla.play).toHaveBeenCalledWith(container, expect.objectContaining({ dbType: 'postgresql', dark: true, muted: true }))
  })

  it('no llama play si isLoading ya era true (sin transicion)', async () => {
    mockStore.isLoading = true
    const { rerender } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(document.createElement('div'))
      return useSQLParseAnim(ref)
    })
    await act(async () => { rerender() })
    expect(sqla.play).not.toHaveBeenCalled()
  })

  it('llama stop al desmontar', () => {
    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(document.createElement('div'))
      return useSQLParseAnim(ref)
    })
    unmount()
    expect(sqla.stop).toHaveBeenCalled()
  })
})
