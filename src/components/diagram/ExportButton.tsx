import { useState } from 'react'
import { useExport } from '@/hooks/useExport'

export function ExportButton() {
  const { exportPNG, exportSVG } = useExport()
  const [exporting, setExporting] = useState<'png' | 'svg' | null>(null)

  const handle = async (type: 'png' | 'svg') => {
    setExporting(type)
    try {
      if (type === 'png') await exportPNG()
      else await exportSVG()
    } finally {
      setExporting(null)
    }
  }

  const btnStyle = (type: 'png' | 'svg'): React.CSSProperties => ({
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '4px 10px',
    cursor: exporting ? 'wait' : 'pointer',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    opacity: exporting && exporting !== type ? 0.5 : 1,
    transition: 'opacity 0.15s',
  })

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button
        onClick={() => handle('png')}
        disabled={!!exporting}
        aria-label="Export diagram as PNG"
        style={btnStyle('png')}
      >
        {exporting === 'png' ? '...' : '↓ PNG'}
      </button>
      <button
        onClick={() => handle('svg')}
        disabled={!!exporting}
        aria-label="Export diagram as SVG"
        style={btnStyle('svg')}
      >
        {exporting === 'svg' ? '...' : '↓ SVG'}
      </button>
    </div>
  )
}
