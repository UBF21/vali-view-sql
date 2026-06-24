import { useState, useEffect } from 'react'
import { Download, FileText } from 'lucide-react'
import { useExport } from '@/hooks/useExport'
import { useAppStore } from '@/store/useAppStore'

type ExportType = 'png' | 'svg' | 'report'

const BTN_CONFIG: { type: ExportType; ariaLabel: string; title: string }[] = [
  { type: 'png',    ariaLabel: 'Export diagram as PNG',  title: 'Export diagram as PNG' },
  { type: 'svg',    ariaLabel: 'Export diagram as SVG',  title: 'Export diagram as SVG' },
  { type: 'report', ariaLabel: 'Export analysis report', title: 'Open analysis report in new tab' },
]

const LABELS: Record<ExportType, string> = { png: 'PNG', svg: 'SVG', report: 'Report' }
const EMPTY_TITLE = 'Diagram is empty — type a SQL query first'

function isCvsType(t: ExportType): t is 'png' | 'svg' { return t === 'png' || t === 'svg' }

function btnStyle(active: boolean, disabled: boolean, isOther: boolean): React.CSSProperties {
  const cursor = disabled ? 'not-allowed' : active ? 'wait' : 'pointer'
  return {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6,
    padding: '4px 10px', cursor, fontSize: 11, fontWeight: 600,
    color: 'var(--text-secondary)', opacity: disabled || isOther ? 0.45 : 1,
    transition: 'opacity 0.15s', display: 'flex', alignItems: 'center', gap: 5,
  }
}

function BtnContent({ type, active }: { type: ExportType; active: boolean }) {
  if (active) return <span>Exporting...</span>
  const Icon = type === 'report' ? FileText : Download
  return <><Icon size={13} /> {LABELS[type]}</>
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <span role="alert" style={{ fontSize: 10, color: '#E24B4A', maxWidth: 200, textAlign: 'right' }}>
      {message}
    </span>
  )
}

function useExportState() {
  const { exportPNG, exportSVG, exportReport } = useExport()
  const [exporting, setExporting] = useState<ExportType | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(null), 3000)
    return () => clearTimeout(t)
  }, [error])

  const handle = async (type: ExportType) => {
    setExporting(type); setError(null)
    try {
      if (type === 'png') await exportPNG()
      else if (type === 'svg') await exportSVG()
      else await exportReport()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally { setExporting(null) }
  }

  return { exporting, error, handle }
}

export function ExportButton() {
  const nodes = useAppStore((s) => s.parseResult?.nodes ?? [])
  const { exporting, error, handle } = useExportState()
  const canvasEmpty = nodes.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {BTN_CONFIG.map(({ type, ariaLabel, title }) => {
          const disabled = isCvsType(type) && canvasEmpty
          const isOther  = !!exporting && exporting !== type
          return (
            <button
              key={type}
              onClick={() => !disabled && handle(type)}
              disabled={!!exporting || disabled}
              aria-label={ariaLabel}
              title={disabled ? EMPTY_TITLE : title}
              style={btnStyle(exporting === type, disabled, isOther)}
            >
              <BtnContent type={type} active={exporting === type} />
            </button>
          )
        })}
      </div>
      {error && <ErrorBanner message={error} />}
    </div>
  )
}
