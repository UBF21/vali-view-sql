import { useRef, useCallback, useMemo, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { AlignLeft } from 'lucide-react'
import { formatSQL } from '@/lib/formatter/sql-formatter'
import { highlightSQLWithClause } from '@/lib/highlight/sql-highlight'
import type { Dialect, Issue } from '@/types'

interface QueryEditorProps {
  value: string
  onChange: (value: string) => void
  dialect: Dialect
  placeholder?: string
  className?: string
  style?: CSSProperties
  highlightClause?: string
  pendingSnippet?: string | null
  clearPendingSnippet?: () => void
  issues?: Issue[]
}

const LINE_H  = 13 * 1.6  // matches SHARED fontSize * lineHeight
const PAD_TOP = 12         // matches SHARED padding top

function ErrorLineOverlay({ issues }: { issues: Issue[] }) {
  const errorLines = issues.filter(i => i.line != null && i.severity === 'error').map(i => i.line!)
  const warnLines  = issues.filter(i => i.line != null && i.severity !== 'error').map(i => i.line!)

  return (
    <>
      {errorLines.map(line => (
        <div key={`err-${line}`} style={{
          position: 'absolute', left: 0, right: 0,
          top: PAD_TOP + (line - 1) * LINE_H, height: LINE_H,
          background: 'rgba(226,75,74,0.10)',
          borderLeft: '2px solid #E24B4A',
          pointerEvents: 'none',
        }} />
      ))}
      {warnLines.map(line => (
        <div key={`warn-${line}`} style={{
          position: 'absolute', left: 0, right: 0,
          top: PAD_TOP + (line - 1) * LINE_H, height: LINE_H,
          background: 'rgba(239,159,39,0.08)',
          borderLeft: '2px solid #EF9F27',
          pointerEvents: 'none',
        }} />
      ))}
    </>
  )
}

const SHARED: CSSProperties = {
  fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, monospace',
  fontSize: 13,
  lineHeight: 1.6,
  padding: '12px 14px',
  margin: 0,
  border: 'none',
  outline: 'none',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  overflowWrap: 'break-word',
  boxSizing: 'border-box',
  width: '100%',
  minHeight: '100%',
}

export function QueryEditor({ value, onChange, dialect, placeholder, className, style, highlightClause, pendingSnippet, clearPendingSnippet, issues }: QueryEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef   = useRef<HTMLPreElement>(null)
  const overlayRef  = useRef<HTMLDivElement>(null)

  const highlighted = useMemo(
    () => highlightSQLWithClause(value, highlightClause),
    [value, highlightClause],
  )

  useEffect(() => {
    if (!highlightClause || !textareaRef.current) return
    const textarea = textareaRef.current
    const idx = value.indexOf(highlightClause)
    if (idx === -1) return
    const linesBefore = value.substring(0, idx).split('\n').length - 1
    const lineHeightPx = 13 * 1.6
    const paddingTop = 12
    const targetTop = paddingTop + linesBefore * lineHeightPx
    const scrollTop = Math.max(0, targetTop - textarea.clientHeight / 3)
    textarea.scrollTop = scrollTop
    if (scrollRef.current) scrollRef.current.scrollTop = scrollTop
  }, [highlightClause, value])

  useEffect(() => {
    if (!pendingSnippet || !textareaRef.current) return
    const textarea = textareaRef.current
    if (!value.trim()) {
      onChange(pendingSnippet)
    } else {
      const start = textarea.selectionStart
      const next = value.substring(0, start) + '\n' + pendingSnippet + value.substring(start)
      onChange(next)
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1 + pendingSnippet.length
      })
    }
    clearPendingSnippet?.()
  }, [pendingSnippet]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value),
    [onChange]
  )

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const el = e.currentTarget
      const start = el.selectionStart
      const end = el.selectionEnd
      const next = el.value.substring(0, start) + '  ' + el.value.substring(end)
      onChange(next)
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 2 })
    }
    // Shift+Alt+F → format
    if (e.shiftKey && e.altKey && e.key === 'F') {
      e.preventDefault()
      onChange(formatSQL(value, dialect))
    }
  }, [onChange, value, dialect])

  const syncScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = e.currentTarget.scrollTop
      scrollRef.current.scrollLeft = e.currentTarget.scrollLeft
    }
    if (overlayRef.current) {
      overlayRef.current.style.transform = `translateY(${-e.currentTarget.scrollTop}px)`
    }
  }, [])

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Format button */}
      <button
        onClick={() => onChange(formatSQL(value, dialect))}
        aria-label="Format SQL (Shift+Alt+F)"
        title="Format SQL (Shift+Alt+F)"
        style={{
          position: 'absolute', top: 6, right: 8, zIndex: 3,
          background: 'var(--elevated)', border: '1px solid var(--border)',
          borderRadius: 5, padding: '3px 6px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 10, color: 'var(--text-2)',
        }}
      >
        <AlignLeft size={11} />
        Format
      </button>

      {/* Error/warning line overlay — behind backdrop */}
      {issues && issues.some(i => i.line != null) && (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          <div ref={overlayRef} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
            <ErrorLineOverlay issues={issues} />
          </div>
        </div>
      )}

      {/* Highlighted backdrop — carries all the visible colors */}
      <pre
        ref={scrollRef}
        aria-hidden="true"
        style={{
          ...SHARED,
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          color: 'var(--text-1)',
          zIndex: 1,
        }}
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />

      {/* Editable textarea — text is transparent so backdrop colors show through; caret is amber */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onScroll={syncScroll}
        placeholder={placeholder ?? 'SELECT * FROM users WHERE active = true...'}
        spellCheck={false}
        className="sq-editor-ta"
        style={{
          ...SHARED,
          position: 'absolute',
          inset: 0,
          resize: 'none',
          background: 'transparent',
          color: 'transparent',
          caretColor: 'var(--a)',
          zIndex: 2,
          border: 'none',
          outline: 'none',
          overflowY: 'auto',
        }}
      />
    </div>
  )
}
