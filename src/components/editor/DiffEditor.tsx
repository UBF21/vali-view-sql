import { ArrowLeftRight } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { QueryEditor } from './QueryEditor'

const BADGE_A: React.CSSProperties = {
  display: 'inline-block', padding: '1px 7px', borderRadius: 10,
  fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
  color: '#60A5FA', background: 'rgba(96,165,250,0.12)',
}

const BADGE_B: React.CSSProperties = {
  display: 'inline-block', padding: '1px 7px', borderRadius: 10,
  fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
  color: '#FB923C', background: 'rgba(251,146,60,0.12)',
}

const labelRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
}

const labelTextStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.08em',
}

const editorColStyle: React.CSSProperties = {
  flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden',
}

function DividerWithIcon() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0, width: 24, gap: 4,
    }}>
      <div style={{ flex: 1, width: 1, background: 'var(--border)' }} />
      <ArrowLeftRight size={12} color="var(--text-3, var(--text-secondary))" strokeWidth={2} />
      <div style={{ flex: 1, width: 1, background: 'var(--border)' }} />
    </div>
  )
}

export function DiffEditor() {
  const query = useAppStore((s) => s.query)
  const queryB = useAppStore((s) => s.queryB)
  const setQuery = useAppStore((s) => s.setQuery)
  const setQueryB = useAppStore((s) => s.setQueryB)

  return (
    <div style={{ display: 'flex', gap: 4, height: '100%', overflow: 'hidden', padding: '4px 0' }}>
      <div style={editorColStyle}>
        <div style={labelRowStyle}>
          <span style={labelTextStyle}>Query</span>
          <span style={BADGE_A}>A</span>
        </div>
        <QueryEditor value={query} onChange={setQuery} placeholder="SELECT ... (Query A)" style={{ flex: 1 }} />
      </div>
      <DividerWithIcon />
      <div style={editorColStyle}>
        <div style={labelRowStyle}>
          <span style={labelTextStyle}>Query</span>
          <span style={BADGE_B}>B</span>
        </div>
        <QueryEditor value={queryB} onChange={setQueryB} placeholder="SELECT ... (Query B)" style={{ flex: 1 }} />
      </div>
    </div>
  )
}
