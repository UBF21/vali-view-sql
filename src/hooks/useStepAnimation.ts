import { useState, useEffect, useRef, useCallback } from 'react'
import type { Step } from '@/types'

export type StepSpeed = 500 | 1000 | 1500 | 2000

export interface StepAnimationState {
  currentIndex: number
  isPlaying: boolean
  isComplete: boolean
  totalSteps: number
  currentStep: Step | null
  speed: StepSpeed
  goNext: () => void
  goPrev: () => void
  goReset: () => void
  goToEnd: () => void
  togglePlay: () => void
  goToIndex: (i: number) => void
  setSpeed: (s: StepSpeed) => void
}

// — helpers —

function advanceIndex(prev: number, total: number, stop: () => void): number {
  if (prev >= total - 1) { stop(); return prev }
  return prev + 1
}

function clearTimer(ref: React.MutableRefObject<ReturnType<typeof setInterval> | null>): void {
  if (ref.current) clearInterval(ref.current)
}

interface AutoPlayConfig {
  isPlaying: boolean
  total: number
  speed: StepSpeed
  setIndex: React.Dispatch<React.SetStateAction<number>>
  stop: () => void
}

function useAutoPlay({ isPlaying, total, speed, setIndex, stop }: AutoPlayConfig): void {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (!isPlaying || total === 0) { clearTimer(timerRef); return }
    timerRef.current = setInterval(
      () => setIndex(prev => advanceIndex(prev, total, stop)),
      speed,
    )
    return () => clearTimer(timerRef)
  }, [isPlaying, total, speed, setIndex, stop])
}

// — hook público —

export function useStepAnimation(steps: Step[]): StepAnimationState {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState<StepSpeed>(1500)

  useEffect(() => { setCurrentIndex(0); setIsPlaying(false) }, [steps])

  const stop = useCallback(() => setIsPlaying(false), [])
  useAutoPlay({ isPlaying, total: steps.length, speed, setIndex: setCurrentIndex, stop })

  const goNext     = useCallback(() => { if (steps.length === 0) return; setCurrentIndex(p => Math.min(p + 1, steps.length - 1)) }, [steps.length])
  const goPrev     = useCallback(() => setCurrentIndex(p => Math.max(p - 1, 0)), [])
  const goReset    = useCallback(() => { setCurrentIndex(0); setIsPlaying(false) }, [])
  const goToEnd    = useCallback(() => { if (steps.length === 0) return; setCurrentIndex(steps.length - 1); setIsPlaying(false) }, [steps.length])
  const togglePlay = useCallback(() => {
    const atEnd = steps.length > 0 && currentIndex === steps.length - 1
    if (atEnd) { setCurrentIndex(0); setIsPlaying(true); return }
    setIsPlaying(p => !p)
  }, [currentIndex, steps.length])
  const goToIndex  = useCallback((i: number) => { setIsPlaying(false); setCurrentIndex(Math.max(0, Math.min(i, steps.length - 1))) }, [steps.length])

  return {
    currentIndex, isPlaying,
    isComplete: steps.length > 0 && currentIndex === steps.length - 1,
    totalSteps: steps.length,
    currentStep: steps[currentIndex] ?? null,
    speed, goNext, goPrev, goReset, goToEnd, togglePlay, goToIndex, setSpeed,
  }
}
