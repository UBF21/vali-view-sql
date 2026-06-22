import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { play, stop } from '@/lib/sqla'

export function useSQLParseAnim(containerRef: React.RefObject<HTMLDivElement | null>) {
  const isLoading = useAppStore((s) => s.isLoading)
  const dialect   = useAppStore((s) => s.dialect)
  const theme     = useAppStore((s) => s.theme)

  const [isAnimating, setIsAnimating] = useState(false)
  const prevLoadingRef = useRef(isLoading)
  const dialectRef     = useRef(dialect)
  const themeRef       = useRef(theme)

  dialectRef.current = dialect
  themeRef.current   = theme

  useEffect(() => {
    const wasLoading = prevLoadingRef.current
    prevLoadingRef.current = isLoading
    if (wasLoading || !isLoading) return
    const container = containerRef.current
    if (!container) return
    setIsAnimating(true)
    play(container, {
      dbType:     dialectRef.current,
      dark:       themeRef.current === 'dark',
      muted:      true,
      onComplete: () => setIsAnimating(false),
    })
  }, [isLoading, containerRef])

  useEffect(() => () => { stop() }, [])

  return { isAnimating }
}
