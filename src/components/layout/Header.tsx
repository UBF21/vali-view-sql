import { useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { DialectSelector } from '@/components/editor/DialectSelector'
import type { Dialect } from '@/types'

export function Header() {
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)
  const dialect = useAppStore((s) => s.dialect)
  const setDialect = useAppStore((s) => s.setDialect)

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      // TODO: toast notification in a future batch
      console.info('[Header] link copied')
    }).catch(console.error)
  }, [])

  return (
    <header
      style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 'auto' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace' }}>
          Vali-ViewSql
        </span>
        <span
          style={{
            fontSize: 10, fontWeight: 500,
            background: 'var(--accent)', color: '#fff',
            borderRadius: 4, padding: '1px 6px', letterSpacing: '0.05em',
          }}
        >
          SQL Explainer
        </span>
      </div>

      {/* Dialect selector */}
      <DialectSelector value={dialect} onChange={(d: Dialect) => setDialect(d)} />

      {/* Copy Link */}
      <button
        onClick={copyLink}
        title="Copy shareable link"
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '4px 10px',
          cursor: 'pointer',
          fontSize: 12,
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <span>🔗</span>
        <span>Copy Link</span>
      </button>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '4px 8px',
          cursor: 'pointer',
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </header>
  )
}
