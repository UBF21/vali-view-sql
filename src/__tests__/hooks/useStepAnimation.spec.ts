// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStepAnimation } from '@/hooks/useStepAnimation'
import type { Step } from '@/types'

function makeSteps(n: number): Step[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `step-${i}`,
    nodeId: `node-${i}`,
    title: `Step ${i + 1}: Node`,
    description: `desc ${i}`,
    edgeIds: [],
  }))
}

// Referencias estables para evitar que useEffect([steps]) resetee entre renders
const STEPS_3 = makeSteps(3)
const STEPS_2 = makeSteps(2)
const STEPS_4 = makeSteps(4)
const STEPS_5 = makeSteps(5)
const STEPS_EMPTY: Step[] = []

describe('useStepAnimation — state inicial', () => {
  it('arranca en índice 0, pausado, no completo', () => {
    const { result } = renderHook(() => useStepAnimation(STEPS_3))
    expect(result.current.currentIndex).toBe(0)
    expect(result.current.isPlaying).toBe(false)
    expect(result.current.isComplete).toBe(false)
    expect(result.current.totalSteps).toBe(3)
    expect(result.current.speed).toBe(1500)
  })

  it('isComplete es true cuando currentIndex === totalSteps - 1', () => {
    const { result } = renderHook(() => useStepAnimation(STEPS_2))
    act(() => result.current.goToEnd())
    expect(result.current.isComplete).toBe(true)
  })

  it('sin steps, isComplete es false', () => {
    const { result } = renderHook(() => useStepAnimation(STEPS_EMPTY))
    expect(result.current.isComplete).toBe(false)
  })
})

describe('useStepAnimation — navegación manual', () => {
  it('goNext avanza el índice', () => {
    const { result } = renderHook(() => useStepAnimation(STEPS_3))
    act(() => result.current.goNext())
    expect(result.current.currentIndex).toBe(1)
  })

  it('goNext no pasa del último step', () => {
    const { result } = renderHook(() => useStepAnimation(STEPS_2))
    act(() => { result.current.goNext(); result.current.goNext(); result.current.goNext() })
    expect(result.current.currentIndex).toBe(1)
  })

  it('goPrev no baja de 0', () => {
    const { result } = renderHook(() => useStepAnimation(STEPS_3))
    act(() => result.current.goPrev())
    expect(result.current.currentIndex).toBe(0)
  })

  it('goReset vuelve a 0 y pausa', () => {
    const { result } = renderHook(() => useStepAnimation(STEPS_3))
    act(() => { result.current.goNext(); result.current.goNext() })
    act(() => result.current.goReset())
    expect(result.current.currentIndex).toBe(0)
    expect(result.current.isPlaying).toBe(false)
  })

  it('goToEnd va al último step y pausa', () => {
    const { result } = renderHook(() => useStepAnimation(STEPS_4))
    act(() => result.current.goToEnd())
    expect(result.current.currentIndex).toBe(3)
    expect(result.current.isPlaying).toBe(false)
    expect(result.current.isComplete).toBe(true)
  })

  it('goToIndex clamped y pausa el auto-play', () => {
    const { result } = renderHook(() => useStepAnimation(STEPS_5))
    act(() => result.current.togglePlay())
    act(() => result.current.goToIndex(3))
    expect(result.current.currentIndex).toBe(3)
    expect(result.current.isPlaying).toBe(false)
  })

  it('goToIndex clampea valores fuera de rango', () => {
    const { result } = renderHook(() => useStepAnimation(STEPS_3))
    act(() => result.current.goToIndex(99))
    expect(result.current.currentIndex).toBe(2)
    act(() => result.current.goToIndex(-5))
    expect(result.current.currentIndex).toBe(0)
  })
})

describe('useStepAnimation — speed', () => {
  it('setSpeed cambia el valor de speed', () => {
    const { result } = renderHook(() => useStepAnimation(STEPS_3))
    act(() => result.current.setSpeed(500))
    expect(result.current.speed).toBe(500)
  })
})

describe('useStepAnimation — auto-play (fake timers)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('togglePlay inicia el auto-play y avanza pasos', () => {
    const { result } = renderHook(() => useStepAnimation(STEPS_3))
    act(() => result.current.togglePlay())
    expect(result.current.isPlaying).toBe(true)
    act(() => vi.advanceTimersByTime(1500))
    expect(result.current.currentIndex).toBe(1)
  })

  it('auto-play se detiene al llegar al último step', () => {
    const { result } = renderHook(() => useStepAnimation(STEPS_2))
    act(() => result.current.togglePlay())
    // primer tick: avanza de 0→1 (último), invoca stop() internamente
    act(() => vi.advanceTimersByTime(1500))
    expect(result.current.currentIndex).toBe(1)
    // segundo tick: no avanza más (ya está detenido)
    act(() => vi.advanceTimersByTime(1500))
    expect(result.current.currentIndex).toBe(1)
    expect(result.current.isPlaying).toBe(false)
  })

  it('respeta el speed configurado', () => {
    const { result } = renderHook(() => useStepAnimation(STEPS_3))
    act(() => result.current.setSpeed(500))
    act(() => result.current.togglePlay())
    act(() => vi.advanceTimersByTime(500))
    expect(result.current.currentIndex).toBe(1)
  })
})

describe('useStepAnimation — reset al cambiar steps', () => {
  it('vuelve a índice 0 cuando cambia el array de steps', () => {
    let steps = STEPS_3
    const { result, rerender } = renderHook(() => useStepAnimation(steps))
    act(() => result.current.goNext())
    expect(result.current.currentIndex).toBe(1)
    steps = STEPS_5
    rerender()
    expect(result.current.currentIndex).toBe(0)
    expect(result.current.isPlaying).toBe(false)
  })
})
