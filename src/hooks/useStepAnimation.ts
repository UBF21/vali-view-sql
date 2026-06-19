import { useState, useEffect, useRef, useCallback } from 'react'
import type { Step } from '@/types'

const AUTO_PLAY_INTERVAL_MS = 1500

export interface StepAnimationState {
  currentIndex: number
  isPlaying: boolean
  totalSteps: number
  currentStep: Step | null
  goNext: () => void
  goPrev: () => void
  goReset: () => void
  togglePlay: () => void
  goToIndex: (i: number) => void
}

export function useStepAnimation(steps: Step[]): StepAnimationState {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reset cuando cambian los steps (nueva query parseada)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentIndex(0)
    setIsPlaying(false)
  }, [steps])

  // Auto-play
  useEffect(() => {
    if (!isPlaying || steps.length === 0) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, AUTO_PLAY_INTERVAL_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isPlaying, steps.length])

  const goNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(prev + 1, steps.length - 1))
  }, [steps.length])

  const goPrev = useCallback(() => {
    setCurrentIndex(prev => Math.max(prev - 1, 0))
  }, [])

  const goReset = useCallback(() => {
    setCurrentIndex(0)
    setIsPlaying(false)
  }, [])

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev)
  }, [])

  const goToIndex = useCallback((i: number) => {
    setCurrentIndex(Math.max(0, Math.min(i, steps.length - 1)))
  }, [steps.length])

  return {
    currentIndex,
    isPlaying,
    totalSteps: steps.length,
    currentStep: steps[currentIndex] ?? null,
    goNext,
    goPrev,
    goReset,
    togglePlay,
    goToIndex,
  }
}
