import { useCallback } from 'react'
import { Database, RefreshCw, LayoutGrid, Zap, Check, RotateCcw } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { canRewrite, applyRewrite } from '@/lib/optimizer/rewriter'
import type { Suggestion } from '@/types'

// ── Constants ──────────────────────────────────────────────────────────────────

const IMPACT_COLOR: Record<string, string> = {
  high: '#E24B4A',
  medium: '#EF9F27',
  low: '#1D9E75',
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  index: <Database size={12} />,
  rewrite: <RefreshCw size={12} />,
  dialect: <LayoutGrid size={12} />,
  performance: <Zap size={12} />,
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ApplyButton({ id, title, onApply }: { id: string; title: string; onApply: (id: string) => void }) {
  return (
    <button
      onClick={() => onApply(id)}
      aria-label={`Apply suggestion: ${title}`}
      style={{
        fontSize: 10, padding: '2px 8px', borderRadius: 4,
        background: 'var(--a)', color: '#000', border: 'none',
        cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3,
      }}
    >
      <Check size={10} /> Apply
    </button>
  )
}

function CardHeader({ suggestion, onApply }: { suggestion: Suggestion; onApply: (id: string) => void }) {
  const catIcon = CATEGORY_ICON[suggestion.category] ?? <span>•</span>
  const impactColor = IMPACT_COLOR[suggestion.impact]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 12 }}>{catIcon}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
        {suggestion.title}
      </span>
      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: impactColor, color: '#fff', fontWeight: 600 }}>
        {suggestion.impact}
      </span>
      {canRewrite(suggestion.id) && (
        <ApplyButton id={suggestion.id} title={suggestion.title} onApply={onApply} />
      )}
    </div>
  )
}

function BeforeAfterBlock({ suggestion }: { suggestion: Suggestion }) {
  return (
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
  )
}

function SuggestionCard({
  suggestion,
  onApply,
}: {
  suggestion: Suggestion
  onApply: (id: string) => void
}) {
  return (
    <div style={{
      marginBottom: 12,
      padding: '10px 12px',
      background: 'var(--bg-elevated)',
      borderRadius: 6,
      border: '1px solid var(--border)',
    }}>
      <CardHeader suggestion={suggestion} onApply={onApply} />
      <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {suggestion.reason}
      </p>
      <BeforeAfterBlock suggestion={suggestion} />
    </div>
  )
}

function UndoBanner({ onUndo }: { onUndo: () => void }) {
  return (
    <button
      onClick={onUndo}
      style={{
        width: '100%', marginBottom: 8, padding: '6px 12px',
        background: 'var(--elevated)', border: '1px solid var(--border)',
        borderRadius: 6, cursor: 'pointer', fontSize: 11,
        color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6,
      }}
    >
      <RotateCcw size={11} /> Undo last apply
    </button>
  )
}

// ── Panel ──────────────────────────────────────────────────────────────────────

export function SuggestionsPanel() {
  const suggestions   = useAppStore((s) => s.suggestions)
  const query         = useAppStore((s) => s.query)
  const setQuery      = useAppStore((s) => s.setQuery)
  const undoRewrite   = useAppStore((s) => s.undoRewrite)
  const previousQuery = useAppStore((s) => s.previousQuery)

  const handleApply = useCallback((id: string) => {
    setQuery(applyRewrite(query, id))
  }, [query, setQuery])

  if (suggestions.length === 0) {
    return (
      <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center' }}>
        No suggestions yet. Try a more complex query.
      </div>
    )
  }

  return (
    <div style={{ padding: 12, overflowY: 'auto', height: '100%' }}>
      {previousQuery !== null && <UndoBanner onUndo={undoRewrite} />}
      {suggestions.map(s => (
        <SuggestionCard key={s.id} suggestion={s} onApply={handleApply} />
      ))}
    </div>
  )
}
