import type { CSSProperties } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { QueryEditor } from './QueryEditor'

export function DiffEditor() {
  const query = useAppStore((s) => s.query)
  const queryB = useAppStore((s) => s.queryB)
  const setQuery = useAppStore((s) => s.setQuery)
  const setQueryB = useAppStore((s) => s.setQueryB)

  const editorStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    overflow: 'hidden',
  }

  return (
    <div style={{ display: 'flex', gap: 8, height: '100%', overflow: 'hidden' }}>
      <div style={editorStyle}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Query A
        </div>
        <QueryEditor value={query} onChange={setQuery} placeholder="SELECT ... (Query A)" style={{ flex: 1 }} />
      </div>
      <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />
      <div style={editorStyle}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Query B
        </div>
        <QueryEditor value={queryB} onChange={setQueryB} placeholder="SELECT ... (Query B)" style={{ flex: 1 }} />
      </div>
    </div>
  )
}
