import { useCallback, useRef } from 'react'
import { toPng, toSvg } from 'html-to-image'
import { useAppStore } from '@/store/useAppStore'
import { generateReportHTML } from '@/lib/report/report-generator'

function getFlowEl(ref: React.RefObject<HTMLDivElement | null>): HTMLElement | null {
  return ref.current ?? (document.querySelector('.react-flow') as HTMLElement | null)
}

function useExportDiagram() {
  const canvasRef = useRef<HTMLDivElement | null>(null)

  const exportPNG = useCallback(async () => {
    const el = getFlowEl(canvasRef)
    if (!el) return
    const dataUrl = await toPng(el, { cacheBust: true, backgroundColor: 'var(--bg-primary)' })
    const link = document.createElement('a')
    link.download = `vali-view-sql-${Date.now()}.png`
    link.href = dataUrl
    link.click()
  }, [])

  const exportSVG = useCallback(async () => {
    const el = getFlowEl(canvasRef)
    if (!el) return
    const dataUrl = await toSvg(el, { cacheBust: true })
    const link = document.createElement('a')
    link.download = `vali-view-sql-${Date.now()}.svg`
    link.href = dataUrl
    link.click()
  }, [])

  return { exportPNG, exportSVG, canvasRef }
}

function useExportReport(canvasRef: React.RefObject<HTMLDivElement | null>) {
  const query            = useAppStore((s) => s.query)
  const dialect          = useAppStore((s) => s.dialect)
  const issues           = useAppStore((s) => s.issues)
  const suggestions      = useAppStore((s) => s.suggestions)
  const columnLineage    = useAppStore((s) => s.columnLineage)
  const complexityResult = useAppStore((s) => s.complexityResult)

  const exportReport = useCallback(async () => {
    let diagramDataUrl: string | null = null
    try {
      const el = getFlowEl(canvasRef)
      if (el) diagramDataUrl = await toPng(el, { backgroundColor: '#0d0d12', pixelRatio: 1.5 })
    } catch { /* capture failure is non-fatal */ }

    const html = generateReportHTML({
      sql: query, dialect, diagramDataUrl,
      complexity: complexityResult, issues, suggestions, lineage: columnLineage,
    })

    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close() }
  }, [query, dialect, issues, suggestions, columnLineage, complexityResult, canvasRef])

  return { exportReport }
}

export function useExport() {
  const { exportPNG, exportSVG, canvasRef } = useExportDiagram()
  const { exportReport } = useExportReport(canvasRef)
  return { exportPNG, exportSVG, canvasRef, exportReport }
}
