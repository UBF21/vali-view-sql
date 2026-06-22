import { Database, RefreshCw, LayoutGrid, Zap } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { Suggestion } from '@/types'

const IMPACT_COLOR = { high: '#E24B4A', medium: '#EF9F27', low: '#1D9E75' }
const CATEGORY_ICON: Record<string, React.ReactNode> = {
  index: <Database size={12} />,
  rewrite: <RefreshCw size={12} />,
  dialect: <LayoutGrid size={12} />,
  performance: <Zap size={12} />,
}

function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const impactColor = IMPACT_COLOR[suggestion.impact]
  const catIcon = CATEGORY_ICON[suggestion.category] ?? <span>•</span>

  return (
    <div style={{
      marginBottom: 12,
      padding: '10px 12px',
      background: 'var(--bg-elevated)',
      borderRadius: 6,
      border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 12 }}>{catIcon}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
          {suggestion.title}
        </span>
        <span style={{
          fontSize: 10, padding: '1px 6px', borderRadius: 10,
          background: impactColor, color: '#fff', fontWeight: 600,
        }}>
          {suggestion.impact}
        </span>
      </div>
      <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {suggestion.reason}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>Before</div>
          <code style={{
            display: 'block', fontSize: 11, padding: '4px 8px',
            background: '#FFF1F0', borderRadius: 4, color: '#E24B4A',
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>
            {suggestion.before}
          </code>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>After</div>
          <code style={{
            display: 'block', fontSize: 11, padding: '4px 8px',
            background: '#F0FDF9', borderRadius: 4, color: '#1D9E75',
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>
            {suggestion.after}
          </code>
        </div>
      </div>
    </div>
  )
}

export function SuggestionsPanel() {
  const suggestions = useAppStore((s) => s.suggestions)

  if (suggestions.length === 0) {
    return (
      <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center' }}>
        No suggestions yet. Try a more complex query.
      </div>
    )
  }

  return (
    <div style={{ padding: 12, overflowY: 'auto', height: '100%' }}>
      {suggestions.map(s => (
        <SuggestionCard key={s.id} suggestion={s} />
      ))}
    </div>
  )
}
