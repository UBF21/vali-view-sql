import { useCallback, useRef } from 'react'
import { toPng, toSvg } from 'html-to-image'

export function useExport() {
  const canvasRef = useRef<HTMLDivElement | null>(null)

  const exportPNG = useCallback(async () => {
    const el = canvasRef.current ?? document.querySelector('.react-flow') as HTMLElement | null
    if (!el) return
    try {
      const dataUrl = await toPng(el, { cacheBust: true, backgroundColor: 'var(--bg-primary)' })
      const link = document.createElement('a')
      link.download = `vali-viewsql-${Date.now()}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      if (import.meta.env.DEV) console.error('[useExport] PNG failed:', err)
    }
  }, [])

  const exportSVG = useCallback(async () => {
    const el = canvasRef.current ?? document.querySelector('.react-flow') as HTMLElement | null
    if (!el) return
    try {
      const dataUrl = await toSvg(el, { cacheBust: true })
      const link = document.createElement('a')
      link.download = `vali-viewsql-${Date.now()}.svg`
      link.href = dataUrl
      link.click()
    } catch (err) {
      if (import.meta.env.DEV) console.error('[useExport] SVG failed:', err)
    }
  }, [])

  return { exportPNG, exportSVG, canvasRef }
}
