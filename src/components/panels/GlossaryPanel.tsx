import { useState } from 'react'
import { Search } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

type GlossaryEntry = { keyword: string; role: string; detail: string; lineRef?: number }

function GlossarySearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
      <Search size={12} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Filter keywords..."
        aria-label="Filter glossary"
        style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 11, color: 'var(--text-1)' }}
      />
    </div>
  )
}

function GlossaryEntryCard({ entry }: { entry: GlossaryEntry }) {
  return (
    <div style={{ marginBottom: 12, padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 6, borderLeft: '3px solid var(--accent)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <code style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', background: 'var(--bg-surface)', padding: '1px 6px', borderRadius: 4 }}>
          {entry.keyword}
        </code>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{entry.role}</span>
        {entry.lineRef && (
          <span style={{ fontSize: 10, color: 'var(--text-secondary)', marginLeft: 'auto' }}>line {entry.lineRef}</span>
        )}
      </div>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>{entry.detail}</p>
    </div>
  )
}

function GlossaryList({ entries, search }: { entries: GlossaryEntry[]; search: string }) {
  return (
    <div style={{ flex: 1, padding: 12, overflowY: 'auto' }}>
      {entries.length === 0 && (
        <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-3)' }}>
          No keywords match &quot;{search}&quot;
        </div>
      )}
      {entries.map((entry, i) => <GlossaryEntryCard key={i} entry={entry} />)}
    </div>
  )
}

function filterGlossary(glossary: GlossaryEntry[], q: string): GlossaryEntry[] {
  const lq = q.trim().toLowerCase()
  if (!lq) return glossary
  return glossary.filter(e =>
    e.keyword.toLowerCase().includes(lq) ||
    e.role.toLowerCase().includes(lq) ||
    e.detail.toLowerCase().includes(lq)
  )
}

export function GlossaryPanel() {
  const parseResult = useAppStore((s) => s.parseResult)
  const glossary = parseResult?.glossary ?? []
  const [search, setSearch] = useState('')

  if (glossary.length === 0) {
    return (
      <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center' }}>
        Parse a SQL query to see the glossary.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <GlossarySearchBar value={search} onChange={setSearch} />
      <GlossaryList entries={filterGlossary(glossary, search)} search={search} />
    </div>
  )
}
