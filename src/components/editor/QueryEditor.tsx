import { useRef, useCallback, useMemo } from 'react'
import type { CSSProperties } from 'react'

interface QueryEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  style?: CSSProperties
  highlightClause?: string
}

// SQL tokenizer — processes in priority order to avoid keyword matches inside strings/comments
function highlightSQL(text: string): string {
  const KEYWORDS = new Set([
    'SELECT','FROM','WHERE','JOIN','ON','AS','DISTINCT','UNION','INTERSECT','EXCEPT',
    'INSERT','INTO','UPDATE','SET','DELETE','CREATE','DROP','ALTER','TABLE','VIEW',
    'WITH','INNER','LEFT','RIGHT','FULL','CROSS','OUTER','AND','OR','NOT','IN',
    'EXISTS','BETWEEN','LIKE','ILIKE','IS','NULL','ALL','ANY','CASE','WHEN','THEN',
    'ELSE','END','TRUE','FALSE','ASC','DESC','HAVING','LIMIT','OFFSET','RETURNING',
    'VALUES','DEFAULT','PRIMARY','FOREIGN','KEY','REFERENCES','UNIQUE','CHECK',
    'INDEX','IF','BY','GROUP','ORDER','PARTITION','OVER',
  ])
  const FUNCTIONS = new Set([
    'COUNT','SUM','AVG','MIN','MAX','COALESCE','NULLIF','CAST','CONVERT',
    'UPPER','LOWER','LENGTH','SUBSTR','SUBSTRING','TRIM','LTRIM','RTRIM',
    'NOW','CURRENT_DATE','CURRENT_TIMESTAMP','DATE','CONCAT','REPLACE',
    'ROUND','FLOOR','CEIL','ABS','MOD','POWER','SQRT',
    'ROW_NUMBER','RANK','DENSE_RANK','LAG','LEAD',
  ])

  // Tokenise with a single pass — order matters (comments/strings before keywords)
  const TOKEN = /(--[^\n]*|\/\*[\s\S]*?\*\/|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|\b([A-Za-z_][A-Za-z_0-9]*)\b|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g

  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  let result = ''
  let last = 0
  let match: RegExpExecArray | null

  while ((match = TOKEN.exec(text)) !== null) {
    const [full, , word] = match
    const start = match.index

    // plain text between tokens
    if (start > last) result += esc(text.slice(last, start))

    // classify
    if (full.startsWith('--') || full.startsWith('/*')) {
      result += `<span class="sq-comment">${esc(full)}</span>`
    } else if (full[0] === "'" || full[0] === '"' || full[0] === '`') {
      result += `<span class="sq-string">${esc(full)}</span>`
    } else if (word) {
      const up = word.toUpperCase()
      if (KEYWORDS.has(up)) {
        result += `<span class="sq-keyword">${esc(full)}</span>`
      } else if (FUNCTIONS.has(up)) {
        result += `<span class="sq-function">${esc(full)}</span>`
      } else {
        result += esc(full)
      }
    } else if (/^\d/.test(full)) {
      result += `<span class="sq-number">${esc(full)}</span>`
    } else {
      result += esc(full)
    }

    last = start + full.length
  }

  if (last < text.length) result += esc(text.slice(last))

  // preserve trailing newline so backdrop matches textarea height
  return result + '\n'
}

const CLAUSE_STARTERS = /^(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|FULL|CROSS|OUTER|GROUP|HAVING|ORDER|LIMIT|OFFSET|UNION|INTERSECT|EXCEPT|WITH|ON|SET|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|DECLARE|IF|WHILE|BEGIN|END)\b/i

function wrapMark(html: string) {
  return `<mark class="sq-clause-highlight">${html}</mark>`
}

function hlLine(line: string) {
  return highlightSQL(line).replace(/\n$/, '')
}

function applyExactHighlight(value: string, clause: string): string | null {
  const idx = value.toUpperCase().indexOf(clause.toUpperCase())
  if (idx === -1) return null
  const end    = idx + clause.length
  const before = hlLine(value.slice(0, idx))
  const mid    = hlLine(value.slice(idx, end))
  const after  = highlightSQL(value.slice(end))
  return `${before}${wrapMark(mid)}${after}`
}

interface ResolveCtx { keyword: string; hint: string | undefined; wasActive: boolean }

// Pure helper — determines new active state when a clause-starting line is encountered
function resolveActive(trimmed: string, ctx: ResolveCtx): { active: boolean; didFind: boolean } {
  if (!CLAUSE_STARTERS.test(trimmed))               return { active: ctx.wasActive, didFind: false }
  const lineKw = trimmed.split(/\s+/)[0].toUpperCase()
  if (lineKw !== ctx.keyword)                       return { active: false, didFind: false }
  const matches = !ctx.hint || trimmed.toUpperCase().includes(ctx.hint)
  return matches ? { active: true, didFind: true } : { active: false, didFind: false }
}

// hint = table name / second word — disambiguates when same keyword appears multiple times
function applyKeywordLineHighlight(value: string, keyword: string, hint?: string): string | null {
  const lines = value.split('\n')
  let active = false
  let found  = false

  const parts = lines.map((line) => {
    const r = resolveActive(line.trimStart(), { keyword, hint, wasActive: active })
    active = r.active
    if (r.didFind) found = true
    return active ? wrapMark(hlLine(line)) : hlLine(line)
  })

  return found ? parts.join('\n') + '\n' : null
}

function highlightSQLWithClause(value: string, clause?: string): string {
  if (!clause) return highlightSQL(value)
  const exact = applyExactHighlight(value, clause)
  if (exact) return exact
  const words   = clause.trim().toUpperCase().split(/\s+/)
  const keyword = words[0]
  const hint    = words[1]
  // Parser normalizes "JOIN" → "INNER JOIN", "LEFT JOIN", etc.
  // When the 2nd token is "JOIN", the 3rd token is the actual table name.
  // Try the modifier keyword first (covers explicit "INNER JOIN tbl"), then plain "JOIN" (covers "JOIN tbl").
  if (hint === 'JOIN') {
    const tableHint = words[2]
    return applyKeywordLineHighlight(value, keyword, tableHint)
        ?? applyKeywordLineHighlight(value, 'JOIN', tableHint)
        ?? highlightSQL(value)
  }
  return applyKeywordLineHighlight(value, keyword, hint) ?? highlightSQL(value)
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

export function QueryEditor({ value, onChange, placeholder, className, style, highlightClause }: QueryEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLPreElement>(null)

  const highlighted = useMemo(
    () => highlightSQLWithClause(value, highlightClause),
    [value, highlightClause],
  )

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
  }, [onChange])

  const syncScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = e.currentTarget.scrollTop
      scrollRef.current.scrollLeft = e.currentTarget.scrollLeft
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
