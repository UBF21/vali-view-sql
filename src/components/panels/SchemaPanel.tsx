import { useState } from 'react'
import { Upload, X, Database, ChevronDown, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { SchemaTable } from '@/lib/schema/types'

interface TableTreeProps {
  tableName: string
  table: SchemaTable
}

function ColumnRow({ col }: { col: SchemaTable['columns'][number] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 6px', fontSize: 10 }}>
      <span style={{ color: col.isPrimaryKey ? '#EF9F27' : col.isForeignKey ? '#9B59B6' : 'var(--text-2)', fontFamily: 'monospace', flex: 1 }}>
        {col.name}
      </span>
      <span style={{ color: 'var(--text-3)', fontFamily: 'monospace' }}>{col.type}</span>
      {col.isPrimaryKey && <span style={{ fontSize: 8, padding: '0 3px', background: '#EF9F2733', color: '#EF9F27', borderRadius: 2 }}>PK</span>}
      {col.isForeignKey && <span style={{ fontSize: 8, padding: '0 3px', background: '#9B59B633', color: '#9B59B6', borderRadius: 2 }}>FK</span>}
      {col.isIndexed && !col.isPrimaryKey && <span style={{ fontSize: 8, padding: '0 3px', background: '#1D9E7533', color: '#1D9E75', borderRadius: 2 }}>IX</span>}
      {col.nullable && <span style={{ fontSize: 8, color: 'var(--text-3)' }}>null</span>}
    </div>
  )
}

function TableTree({ tableName, table }: TableTreeProps) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginBottom: 4 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer', fontSize: 11 }}
      >
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        <Database size={11} style={{ color: 'var(--a)', flexShrink: 0 }} />
        <span style={{ fontWeight: 600, color: 'var(--text-1)', flex: 1, textAlign: 'left' }}>{tableName}</span>
        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{table.columns.length} cols</span>
      </button>
      {open && (
        <div style={{ paddingLeft: 16, marginTop: 2 }}>
          {table.columns.map(col => <ColumnRow key={col.name} col={col} />)}
        </div>
      )}
    </div>
  )
}

function SchemaLoaded({ tables }: { tables: [string, SchemaTable][] }) {
  const clearSchema = useAppStore((s) => s.clearSchema)

  const handleClear = () => {
    if (window.confirm('Clear schema? This will disable column validation until you reload it.')) {
      clearSchema()
    }
  }

  return (
    <div style={{ padding: 12, overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--text-2)' }}>
          {tables.length} table{tables.length !== 1 ? 's' : ''} loaded
        </span>
        <button
          onClick={handleClear}
          aria-label="Clear schema"
          style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'none', border: '1px solid var(--border)', cursor: 'pointer', color: '#E24B4A', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <X size={10} /> Clear
        </button>
      </div>
      {tables.map(([name, table]) => <TableTree key={name} tableName={name} table={table} />)}
    </div>
  )
}

function SchemaEmpty() {
  const loadSchema = useAppStore((s) => s.loadSchema)
  const [ddl, setDdl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleLoad = () => {
    if (!ddl.trim()) { setError('Paste a CREATE TABLE statement first'); return }
    try { loadSchema(ddl); setError(null) }
    catch { setError('Could not parse DDL. Check the syntax and try again.') }
  }

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
      <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }}>
        Paste your <code>CREATE TABLE</code> statements to enable column validation, missing index detection, and type checks.
      </p>
      <textarea
        value={ddl}
        onChange={e => setDdl(e.target.value)}
        placeholder={`CREATE TABLE users (\n  id SERIAL PRIMARY KEY,\n  email VARCHAR(255) NOT NULL\n);`}
        spellCheck={false}
        style={{ flex: 1, width: '100%', minHeight: 180, padding: '8px 10px', borderRadius: 6, resize: 'vertical', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: 11, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}
      />
      {error && <p style={{ fontSize: 10, color: '#E24B4A', margin: 0 }}>{error}</p>}
      <button
        onClick={handleLoad}
        style={{ padding: '7px 12px', borderRadius: 6, background: 'var(--a)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#000', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
      >
        <Upload size={12} /> Load Schema
      </button>
    </div>
  )
}

export function SchemaPanel() {
  const schema = useAppStore((s) => s.schema)
  const tables = schema ? Object.entries(schema) : []
  if (tables.length > 0) return <SchemaLoaded tables={tables} />
  return <SchemaEmpty />
}
