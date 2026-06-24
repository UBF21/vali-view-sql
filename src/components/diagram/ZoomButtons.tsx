import { Minus, Plus, Maximize2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

const BTN: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6,
  padding: '4px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 600,
  color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
}

export function ZoomButtons() {
  const zoomControls = useAppStore(s => s.zoomControls)
  if (!zoomControls) return null

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <button style={BTN} onClick={() => zoomControls.zoomIn()} aria-label="Zoom in" title="Zoom in">
        <Plus size={12} />
      </button>
      <button style={BTN} onClick={() => zoomControls.zoomOut()} aria-label="Zoom out" title="Zoom out">
        <Minus size={12} />
      </button>
      <button style={BTN} onClick={() => zoomControls.fitView({ padding: 0.2 })} aria-label="Fit to view" title="Fit to view">
        <Maximize2 size={12} />
      </button>
    </div>
  )
}
