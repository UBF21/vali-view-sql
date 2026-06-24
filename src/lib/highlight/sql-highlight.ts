// SQL syntax highlighter — shared module used by QueryEditor and ConversionModal

// ── Vocabulary ────────────────────────────────────────────────────────────────

const SQL_KEYWORDS = new Set([
  'SELECT','FROM','WHERE','JOIN','ON','AS','DISTINCT','UNION','INTERSECT','EXCEPT',
  'INSERT','INTO','UPDATE','SET','DELETE','CREATE','DROP','ALTER','TABLE','VIEW',
  'WITH','INNER','LEFT','RIGHT','FULL','CROSS','OUTER','AND','OR','NOT','IN',
  'EXISTS','BETWEEN','LIKE','ILIKE','IS','NULL','ALL','ANY','CASE','WHEN','THEN',
  'ELSE','END','TRUE','FALSE','ASC','DESC','HAVING','LIMIT','OFFSET','RETURNING',
  'VALUES','DEFAULT','PRIMARY','FOREIGN','KEY','REFERENCES','UNIQUE','CHECK',
  'INDEX','IF','BY','GROUP','ORDER','PARTITION','OVER',
])

const SQL_FUNCTIONS = new Set([
  'COUNT','SUM','AVG','MIN','MAX','COALESCE','NULLIF','CAST','CONVERT',
  'UPPER','LOWER','LENGTH','SUBSTR','SUBSTRING','TRIM','LTRIM','RTRIM',
  'NOW','CURRENT_DATE','CURRENT_TIMESTAMP','DATE','CONCAT','REPLACE',
  'ROUND','FLOOR','CEIL','ABS','MOD','POWER','SQRT',
  'ROW_NUMBER','RANK','DENSE_RANK','LAG','LEAD',
])

// Tokenise with a single pass — order matters (comments/strings before keywords)
const TOKEN_RE = /(--[^\n]*|\/\*[\s\S]*?\*\/|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|\b([A-Za-z_][A-Za-z_0-9]*)\b|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g

// ── Private helpers ───────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function span(cls: string, text: string): string {
  return `<span class="${cls}">${esc(text)}</span>`
}

function classifyToken(full: string, word: string | undefined): string {
  if (full.startsWith('--') || full.startsWith('/*')) return span('sq-comment', full)
  if (full[0] === "'" || full[0] === '"' || full[0] === '`') return span('sq-string', full)
  if (/^\d/.test(full)) return span('sq-number', full)
  if (word) {
    const up = word.toUpperCase()
    if (SQL_KEYWORDS.has(up))  return span('sq-keyword', full)
    if (SQL_FUNCTIONS.has(up)) return span('sq-function', full)
  }
  return esc(full)
}

const CLAUSE_STARTERS = /^(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|FULL|CROSS|OUTER|GROUP|HAVING|ORDER|LIMIT|OFFSET|UNION|INTERSECT|EXCEPT|WITH|ON|SET|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|DECLARE|IF|WHILE|BEGIN|END)\b/i

function wrapMark(html: string): string {
  return `<mark class="sq-clause-highlight">${html}</mark>`
}

function hlLine(line: string): string {
  return highlightSQL(line).replace(/\n$/, '')
}

function applyExactHighlight(value: string, clause: string): string | null {
  const idx = value.toUpperCase().indexOf(clause.toUpperCase())
  if (idx === -1) return null
  const end = idx + clause.length
  return hlLine(value.slice(0, idx)) + wrapMark(hlLine(value.slice(idx, end))) + highlightSQL(value.slice(end))
}

interface ResolveCtx { keyword: string; hint: string | undefined; wasActive: boolean }

// Pure helper — determines new active state when a clause-starting line is encountered
function resolveActive(trimmed: string, ctx: ResolveCtx): { active: boolean; didFind: boolean } {
  if (!CLAUSE_STARTERS.test(trimmed)) return { active: ctx.wasActive, didFind: false }
  const lineKw = trimmed.split(/\s+/)[0].toUpperCase()
  if (lineKw !== ctx.keyword)         return { active: false, didFind: false }
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

// ── Public API ────────────────────────────────────────────────────────────────

export function highlightSQL(text: string): string {
  const re = new RegExp(TOKEN_RE.source, 'g')
  let result = ''
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    const [full, , word] = match
    if (match.index > last) result += esc(text.slice(last, match.index))
    result += classifyToken(full, word)
    last = match.index + full.length
  }
  if (last < text.length) result += esc(text.slice(last))
  // preserve trailing newline so backdrop matches textarea height
  return result + '\n'
}

export function highlightSQLWithClause(value: string, clause?: string): string {
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
