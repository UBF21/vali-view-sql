import { useAppStore } from '@/store/useAppStore'

export function GlossaryPanel() {
  const parseResult = useAppStore((s) => s.parseResult)
  const glossary = parseResult?.glossary ?? []

  if (glossary.length === 0) {
    return (
      <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center' }}>
        Parse a SQL query to see the glossary.
      </div>
    )
  }

  return (
    <div style={{ padding: 12, overflowY: 'auto', height: '100%' }}>
      {glossary.map((entry, i) => (
        <div
          key={i}
          style={{
            marginBottom: 12,
            padding: '10px 12px',
            background: 'var(--bg-elevated)',
            borderRadius: 6,
            borderLeft: '3px solid var(--accent)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <code style={{
              fontSize: 12, fontWeight: 700,
              color: 'var(--accent)',
              background: 'var(--bg-surface)',
              padding: '1px 6px', borderRadius: 4,
            }}>
              {entry.keyword}
            </code>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{entry.role}</span>
            {entry.lineRef && (
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                line {entry.lineRef}
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {entry.detail}
          </p>
        </div>
      ))}
    </div>
  )
}
