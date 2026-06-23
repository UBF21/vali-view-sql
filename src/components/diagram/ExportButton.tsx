import { useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { useExport } from '@/hooks/useExport'

type ExportType = 'png' | 'svg' | 'report'

const BTN_CONFIG: { type: ExportType; label: string; ariaLabel: string; title?: string }[] = [
  { type: 'png',    label: 'PNG',    ariaLabel: 'Export diagram as PNG' },
  { type: 'svg',    label: 'SVG',    ariaLabel: 'Export diagram as SVG' },
  { type: 'report', label: 'Report', ariaLabel: 'Export analysis report (HTML)', title: 'Export as report (HTML → PDF)' },
]

function btnStyle(type: ExportType, exporting: ExportType | null): React.CSSProperties {
  return {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6,
    padding: '4px 10px', cursor: exporting ? 'wait' : 'pointer', fontSize: 11, fontWeight: 600,
    color: 'var(--text-secondary)', opacity: exporting && exporting !== type ? 0.5 : 1,
    transition: 'opacity 0.15s', display: 'flex', alignItems: 'center', gap: 5,
  }
}

function BtnIcon({ type, active }: { type: ExportType; active: boolean }) {
  if (active) return <>'...'</>
  const Icon = type === 'report' ? FileText : Download
  const labels: Record<ExportType, string> = { png: 'PNG', svg: 'SVG', report: 'Report' }
  return <><Icon size={13} /> {labels[type]}</>
}

export function ExportButton() {
  const { exportPNG, exportSVG, exportReport } = useExport()
  const [exporting, setExporting] = useState<ExportType | null>(null)

  const handle = async (type: ExportType) => {
    setExporting(type)
    try {
      if (type === 'png') await exportPNG()
      else if (type === 'svg') await exportSVG()
      else await exportReport()
    } finally {
      setExporting(null)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {BTN_CONFIG.map(({ type, ariaLabel, title }) => (
        <button
          key={type}
          onClick={() => handle(type)}
          disabled={!!exporting}
          aria-label={ariaLabel}
          title={title}
          style={btnStyle(type, exporting)}
        >
          <BtnIcon type={type} active={exporting === type} />
        </button>
      ))}
    </div>
  )
}
