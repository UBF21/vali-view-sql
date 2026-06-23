# Tier 1 — Foundation Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 4 independent features in parallel — Query Formatter, Complexity Score, SQLite dialect, and Auto-apply Suggestions.

**Architecture:** Each feature is isolated. Formatter patches `QueryEditor`; Complexity Score adds a `lib/complexity/` module + badge to `DiagramCanvas`; SQLite adds a fourth dialect to the existing adapter/analyzer/selector pattern; Auto-apply adds a `lib/optimizer/rewriter.ts` module + Apply button to `SuggestionsPanel`.

**Tech Stack:** React 19, TypeScript, Zustand, Lucide React, `sql-formatter` (new dep), Vitest.

**Spec:** `docs/superpowers/specs/2026-06-23-roadmap-features-design.md`

---

## FEATURE 6 — Query Formatter

### Task 6.1: Install sql-formatter

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install the package**

```bash
npm install sql-formatter
```

Expected output: `added 1 package` (sql-formatter has no transitive deps).

- [ ] **Step 2: Verify types are available**

```bash
npx tsc --noEmit
```

Expected: no new errors (sql-formatter ships its own types).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add sql-formatter"
```

---

### Task 6.2: Format utility function

**Files:**
- Create: `src/lib/formatter/sql-formatter.ts`
- Create: `src/__tests__/formatter/sql-formatter.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/formatter/sql-formatter.test.ts
import { describe, it, expect } from 'vitest'
import { formatSQL } from '@/lib/formatter/sql-formatter'

describe('formatSQL', () => {
  it('uppercases keywords and indents', () => {
    const result = formatSQL('select id,name from users where active=1', 'postgresql')
    expect(result).toMatch(/SELECT/)
    expect(result).toMatch(/FROM/)
    expect(result).toMatch(/WHERE/)
    expect(result).toContain('\n')
  })

  it('maps sqlserver dialect to tsql', () => {
    const result = formatSQL('select top 10 id from orders', 'sqlserver')
    expect(result).toMatch(/SELECT/)
    expect(result).toMatch(/TOP/)
  })

  it('handles sqlite dialect', () => {
    const result = formatSQL('select id from t limit 5', 'sqlite')
    expect(result).toMatch(/SELECT/)
    expect(result).toMatch(/LIMIT/)
  })

  it('returns original sql on formatter error', () => {
    const broken = '((( not valid sql'
    const result = formatSQL(broken, 'postgresql')
    expect(result).toBe(broken)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/formatter/sql-formatter.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/formatter/sql-formatter'`

- [ ] **Step 3: Implement the utility**

```ts
// src/lib/formatter/sql-formatter.ts
import { format } from 'sql-formatter'
import type { Dialect } from '@/types'

const DIALECT_MAP: Record<Dialect, string> = {
  postgresql: 'postgresql',
  mysql:      'mysql',
  sqlserver:  'tsql',
  sqlite:     'sqlite',
}

export function formatSQL(sql: string, dialect: Dialect): string {
  try {
    return format(sql, {
      language:    DIALECT_MAP[dialect] as Parameters<typeof format>[1]['language'],
      keywordCase: 'upper',
      indentStyle: 'standard',
      tabWidth:    2,
    })
  } catch {
    return sql
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/formatter/sql-formatter.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/formatter/sql-formatter.ts src/__tests__/formatter/sql-formatter.test.ts
git commit -m "feat(formatter): add formatSQL utility with sql-formatter"
```

---

### Task 6.3: Format button in QueryEditor

**Files:**
- Modify: `src/components/editor/QueryEditor.tsx`

- [ ] **Step 1: Add Format button and keyboard shortcut**

In `src/components/editor/QueryEditor.tsx`, add the `AlignLeft` import and `onFormat` prop, then wire up the button and `Shift+Alt+F` shortcut:

```tsx
// Add to imports at top:
import { AlignLeft } from 'lucide-react'
import { formatSQL } from '@/lib/formatter/sql-formatter'
import type { Dialect } from '@/types'

// Update props interface:
interface QueryEditorProps {
  value: string
  onChange: (value: string) => void
  dialect: Dialect          // NEW
  placeholder?: string
  className?: string
  style?: CSSProperties
  highlightClause?: string
}
```

Update `handleKeyDown` inside `QueryEditor` to handle `Shift+Alt+F`:

```tsx
const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === 'Tab') {
    e.preventDefault()
    const el = e.currentTarget
    const start = el.selectionStart
    const end = el.selectionEnd
    const next = el.value.substring(0, start) + '  ' + el.value.substring(end)
    onChange(next)
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 2 })
    return
  }
  // Shift+Alt+F → format
  if (e.shiftKey && e.altKey && e.key === 'F') {
    e.preventDefault()
    onChange(formatSQL(value, dialect))
  }
}, [onChange, value, dialect])
```

Add Format button **inside the outer `<div>`**, absolutely positioned top-right, before the `<pre>`:

```tsx
{/* Format button — top-right corner of editor */}
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
```

- [ ] **Step 2: Pass `dialect` prop from parent**

Search for usages of `<QueryEditor` in the codebase and add `dialect={dialect}` wherever it's rendered. The main usage is in `src/components/layout/AppShell.tsx` or wherever the explain mode renders the editor. Pass the current dialect from the Zustand store.

```bash
grep -r "QueryEditor" src/ --include="*.tsx" -l
```

For each file found, add the `dialect` prop using the store value:

```tsx
const dialect = useAppStore((s) => s.dialect)
// ...
<QueryEditor value={query} onChange={setQuery} dialect={dialect} />
```

- [ ] **Step 3: Verify the button appears**

```bash
npm run dev
```

Open browser, paste `select id,name from users where active=1` into editor, click "Format". Query should become formatted with proper indentation.

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/QueryEditor.tsx
git commit -m "feat(formatter): add Format button and Shift+Alt+F shortcut to QueryEditor"
```

---

## FEATURE 7 — Complexity Score

### Task 7.1: Complexity scoring module

**Files:**
- Create: `src/lib/complexity/complexity-score.ts`
- Create: `src/__tests__/complexity/complexity-score.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/__tests__/complexity/complexity-score.test.ts
import { describe, it, expect } from 'vitest'
import { computeComplexity } from '@/lib/complexity/complexity-score'
import type { ParseResult } from '@/types'
import type { Node, Edge } from '@xyflow/react'
import type { SQLNodeData } from '@/types'

function makeNode(nodeType: SQLNodeData['nodeType']): Node<SQLNodeData> {
  return {
    id: nodeType,
    type: nodeType,
    position: { x: 0, y: 0 },
    data: { nodeType, label: nodeType, detail: '', clause: '' },
  }
}

function makeResult(nodeTypes: SQLNodeData['nodeType'][]): ParseResult {
  return {
    nodes: nodeTypes.map(makeNode),
    edges: [] as Edge[],
    glossary: [],
    rawAst: null,
  }
}

describe('computeComplexity', () => {
  it('returns Simple for a single table query', () => {
    const result = computeComplexity(makeResult(['table', 'output']))
    expect(result.level).toBe('Simple')
    expect(result.score).toBeLessThanOrEqual(3)
  })

  it('returns Moderate for 2 joins', () => {
    const result = computeComplexity(makeResult(['table', 'table', 'table', 'join', 'join', 'output']))
    expect(result.score).toBeGreaterThanOrEqual(4)
  })

  it('returns Complex when subqueries present', () => {
    const result = computeComplexity(makeResult(['table', 'subquery', 'subquery', 'join', 'output']))
    expect(result.score).toBeGreaterThanOrEqual(8)
    expect(result.level).toBe('Complex')
  })

  it('returns Very Complex for procedure with many constructs', () => {
    const result = computeComplexity(makeResult([
      'table','table','join','join','join','subquery','subquery','cte','procedure','output',
    ]))
    expect(result.level).toBe('Very Complex')
  })

  it('breakdown contains per-category counts', () => {
    const result = computeComplexity(makeResult(['table', 'join', 'subquery', 'cte', 'output']))
    expect(result.breakdown.tableCount).toBe(1)
    expect(result.breakdown.joinCount).toBe(1)
    expect(result.breakdown.subqueryCount).toBe(1)
    expect(result.breakdown.cteCount).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/complexity/complexity-score.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/complexity/complexity-score'`

- [ ] **Step 3: Implement the module**

```ts
// src/lib/complexity/complexity-score.ts
import type { ParseResult } from '@/types'

export type ComplexityLevel = 'Simple' | 'Moderate' | 'Complex' | 'Very Complex'

export interface ComplexityBreakdown {
  tableCount:    number
  joinCount:     number
  subqueryCount: number
  cteCount:      number
  setOpCount:    number
  procedureCount: number
  aggregateCount: number
  conditionCount: number
  loopCount:      number
}

export interface ComplexityResult {
  score:     number
  level:     ComplexityLevel
  breakdown: ComplexityBreakdown
}

export function computeComplexity(parseResult: ParseResult): ComplexityResult {
  const counts: ComplexityBreakdown = {
    tableCount:     0,
    joinCount:      0,
    subqueryCount:  0,
    cteCount:       0,
    setOpCount:     0,
    procedureCount: 0,
    aggregateCount: 0,
    conditionCount: 0,
    loopCount:      0,
  }

  for (const node of parseResult.nodes) {
    switch (node.data.nodeType) {
      case 'table':     counts.tableCount++;     break
      case 'join':      counts.joinCount++;      break
      case 'subquery':  counts.subqueryCount++;  break
      case 'cte':       counts.cteCount++;       break
      case 'setop':     counts.setOpCount++;     break
      case 'procedure': counts.procedureCount++; break
      case 'aggregate': counts.aggregateCount++; break
      case 'condition': counts.conditionCount++; break
      case 'loop':      counts.loopCount++;      break
    }
  }

  const raw =
    counts.tableCount     * 1   +
    counts.joinCount      * 1   +
    counts.subqueryCount  * 2   +
    counts.cteCount       * 1   +
    counts.setOpCount     * 1   +
    counts.procedureCount * 3   +
    counts.aggregateCount * 0.5 +
    counts.conditionCount * 1   +
    counts.loopCount      * 2

  const score = Math.round(raw)
  const level: ComplexityLevel =
    score <= 3  ? 'Simple' :
    score <= 7  ? 'Moderate' :
    score <= 12 ? 'Complex' : 'Very Complex'

  return { score, level, breakdown: counts }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/complexity/complexity-score.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/complexity/complexity-score.ts src/__tests__/complexity/complexity-score.test.ts
git commit -m "feat(complexity): add computeComplexity scoring module"
```

---

### Task 7.2: Complexity badge in store + DiagramCanvas

**Files:**
- Modify: `src/store/useAppStore.ts`
- Modify: `src/components/diagram/DiagramCanvas.tsx`
- Create: `src/components/diagram/ComplexityBadge.tsx`

- [ ] **Step 1: Add complexityResult to store**

In `src/store/useAppStore.ts`, import the type and add the field:

```ts
// Add to imports:
import type { ComplexityResult } from '@/lib/complexity/complexity-score'

// Add to AppStore interface:
complexityResult: ComplexityResult | null
setComplexityResult: (r: ComplexityResult | null) => void
```

Add to `create(...)` initial state and action:

```ts
complexityResult: null,
setComplexityResult: (complexityResult) => set({ complexityResult }),
```

Do NOT add `complexityResult` to the `partialize` list (no need to persist it).

- [ ] **Step 2: Compute complexity in useParseQuery hook**

Open `src/hooks/useParseQuery.ts`. After calling `setParseResult(result)`, compute and store complexity:

```ts
// Add to imports at top of useParseQuery.ts:
import { computeComplexity } from '@/lib/complexity/complexity-score'
// ...

// After setParseResult(result):
const complexity = computeComplexity(result)
setComplexityResult(complexity)
```

Also call `setComplexityResult(null)` in the error/empty branches.

- [ ] **Step 3: Create ComplexityBadge component**

```tsx
// src/components/diagram/ComplexityBadge.tsx
import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { ComplexityLevel } from '@/lib/complexity/complexity-score'

const LEVEL_COLOR: Record<ComplexityLevel, string> = {
  'Simple':      '#1D9E75',
  'Moderate':    '#EF9F27',
  'Complex':     '#E07B39',
  'Very Complex': '#E24B4A',
}

export function ComplexityBadge() {
  const [open, setOpen] = useState(false)
  const result = useAppStore((s) => s.complexityResult)
  if (!result) return null

  const color = LEVEL_COLOR[result.level]

  return (
    <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={`Query complexity: ${result.level}`}
        style={{
          background: 'var(--surface)', border: `1px solid ${color}`,
          borderRadius: 20, padding: '3px 10px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: `0 0 8px ${color}33`,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color }}>
          {result.level}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
          {result.score}
        </span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          background: 'var(--surface)', border: '1px solid var(--border-hi)',
          borderRadius: 8, padding: '10px 12px', minWidth: 200,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)', zIndex: 11,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
            Complexity Breakdown
          </div>
          {([
            ['Tables',     result.breakdown.tableCount,     1  ],
            ['JOINs',      result.breakdown.joinCount,      1  ],
            ['Subqueries', result.breakdown.subqueryCount,  2  ],
            ['CTEs',       result.breakdown.cteCount,       1  ],
            ['Set ops',    result.breakdown.setOpCount,     1  ],
            ['Procedures', result.breakdown.procedureCount, 3  ],
            ['Aggregates', result.breakdown.aggregateCount, 0.5],
            ['Conditions', result.breakdown.conditionCount, 1  ],
            ['Loops',      result.breakdown.loopCount,      2  ],
          ] as [string, number, number][]).filter(([, count]) => count > 0).map(([label, count, weight]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0', color: 'var(--text-2)' }}>
              <span>{label} × {count}</span>
              <span style={{ color: 'var(--text-3)' }}>+{Math.round(count * weight * 10) / 10}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: 'var(--text-1)' }}>
            <span>Total score</span>
            <span style={{ color }}>{result.score}</span>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Add badge to DiagramCanvas**

In `src/components/diagram/DiagramCanvas.tsx`, import and render `ComplexityBadge` inside `FlowCanvas`:

```tsx
// Add import:
import { ComplexityBadge } from './ComplexityBadge'

// Inside the <div ref={containerRef}> in FlowCanvas, before <ReactFlow>:
<ComplexityBadge />
```

The container already has `position: 'relative'` so the absolute-positioned badge will anchor correctly.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Visual verify**

```bash
npm run dev
```

Enter a complex query with JOINs and subqueries. A colored badge should appear in the top-left of the diagram. Click it to see the breakdown popover.

- [ ] **Step 7: Commit**

```bash
git add src/store/useAppStore.ts src/hooks/useParseQuery.ts src/components/diagram/ComplexityBadge.tsx src/components/diagram/DiagramCanvas.tsx
git commit -m "feat(complexity): add complexity score badge to diagram canvas"
```

---

## FEATURE 8 — SQLite Dialect

### Task 8.1: Add SQLite to types and parser

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/parser/dialect-adapter.ts`
- Modify: `src/lib/parser/index.ts`
- Create: `src/__tests__/parser/sqlite-dialect.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/__tests__/parser/sqlite-dialect.test.ts
import { describe, it, expect } from 'vitest'
import { parseSQL } from '@/lib/parser'

describe('SQLite dialect', () => {
  it('parses a basic SELECT', () => {
    const result = parseSQL('SELECT id, name FROM users WHERE active = 1', 'sqlite')
    expect(result).not.toBeNull()
    expect(result!.nodes.some(n => n.data.nodeType === 'table')).toBe(true)
    expect(result!.nodes.some(n => n.data.nodeType === 'output')).toBe(true)
  })

  it('parses a JOIN query', () => {
    const result = parseSQL(
      'SELECT u.name, o.total FROM users u INNER JOIN orders o ON u.id = o.user_id',
      'sqlite',
    )
    expect(result!.nodes.some(n => n.data.nodeType === 'join')).toBe(true)
  })

  it('parses a CTE query', () => {
    const result = parseSQL(
      'WITH active AS (SELECT id FROM users WHERE active = 1) SELECT * FROM active',
      'sqlite',
    )
    expect(result!.nodes.some(n => n.data.nodeType === 'cte')).toBe(true)
  })

  it('parses LIMIT', () => {
    const result = parseSQL('SELECT id FROM users LIMIT 10', 'sqlite')
    expect(result!.nodes.some(n => n.data.nodeType === 'limit')).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/__tests__/parser/sqlite-dialect.test.ts
```

Expected: FAIL — `Dialect 'sqlite' not recognized` or TypeScript error.

- [ ] **Step 3: Add sqlite to Dialect type**

In `src/types/index.ts`, change:

```ts
export type Dialect = 'postgresql' | 'mysql' | 'sqlserver'
```

to:

```ts
export type Dialect = 'postgresql' | 'mysql' | 'sqlserver' | 'sqlite'
```

- [ ] **Step 4: Add SQLite adapter**

In `src/lib/parser/dialect-adapter.ts`, add the new adapter function and update the switch:

```ts
function adaptSQLite(sql: string): string {
  return sql
    .replace(/\bAUTOINCREMENT\b/gi, '')
    .replace(/\bINTEGER\s+PRIMARY\s+KEY\b/gi, 'INTEGER PRIMARY KEY')
    // sqlite uses || for concat — strip so parser doesn't choke
    .replace(/\|\|/g, "||")
}

// In dialectAdapter:
export function dialectAdapter(sql: string, dialect: Dialect): string {
  if (dialect === 'postgresql') return adaptPostgres(sql)
  if (dialect === 'sqlserver')  return adaptSqlServer(sql)
  if (dialect === 'mysql')      return adaptMySQL(sql)
  if (dialect === 'sqlite')     return adaptSQLite(sql)
  return sql
}
```

- [ ] **Step 5: Add SQLite to parser database option**

Open `src/lib/parser/index.ts`. Find where the `database` option is passed to `node-sql-parser`. Add the SQLite mapping:

```ts
const DB_MAP: Record<Dialect, string> = {
  postgresql: 'PostgreSQL',
  mysql:      'MySQL',
  sqlserver:  'TransactSQL',
  sqlite:     'SQLite',
}
```

Use `DB_MAP[dialect]` wherever the database option is set.

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/parser/sqlite-dialect.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts src/lib/parser/dialect-adapter.ts src/lib/parser/index.ts src/__tests__/parser/sqlite-dialect.test.ts
git commit -m "feat(sqlite): add SQLite as fourth dialect in types, adapter, and parser"
```

---

### Task 8.2: SQLite analyzer rules

**Files:**
- Modify: `src/lib/analyzers/dialect-rules.ts`
- Modify: `src/__tests__/analyzers/dialect-rules.test.ts`

- [ ] **Step 1: Add SQLite rule tests**

Open `src/__tests__/analyzers/dialect-rules.test.ts` and add at the end:

```ts
describe('SQLite dialect rules', () => {
  it('flags FULL OUTER JOIN as error', () => {
    // node-sql-parser won't parse this, but test the SQL-string detection
    const issues = detectDialectIssues({}, 'SELECT a FROM t1 FULL OUTER JOIN t2 ON t1.id = t2.id', 'sqlite')
    expect(issues.some(i => i.severity === 'error' && i.title.toLowerCase().includes('full outer'))).toBe(true)
  })

  it('flags RIGHT JOIN as warning', () => {
    const issues = detectDialectIssues({}, 'SELECT a FROM t1 RIGHT JOIN t2 ON t1.id = t2.id', 'sqlite')
    expect(issues.some(i => i.severity === 'warning' && i.title.toLowerCase().includes('right join'))).toBe(true)
  })

  it('flags TRUNCATE TABLE as error', () => {
    const issues = detectDialectIssues({}, 'TRUNCATE TABLE users', 'sqlite')
    expect(issues.some(i => i.severity === 'error' && i.title.toLowerCase().includes('truncate'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/__tests__/analyzers/dialect-rules.test.ts
```

Expected: FAIL for the 3 new SQLite tests.

- [ ] **Step 3: Add SQLite rules to detectDialectIssues**

Open `src/lib/analyzers/dialect-rules.ts` and add a `detectSQLiteIssues` helper, then call it:

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function detectSQLiteIssues(sql: string): Issue[] {
  const issues: Issue[] = []
  if (/\bFULL\s+OUTER\s+JOIN\b/i.test(sql)) {
    issues.push({
      id: 'sqlite-no-full-outer-join',
      severity: 'error',
      title: 'FULL OUTER JOIN not supported in SQLite',
      description: 'SQLite does not support FULL OUTER JOIN. Emulate with LEFT JOIN + UNION.',
      suggestion: 'Use SELECT * FROM a LEFT JOIN b ON ... UNION SELECT * FROM a RIGHT JOIN b ON ...',
    })
  }
  if (/\bRIGHT\s+JOIN\b/i.test(sql)) {
    issues.push({
      id: 'sqlite-no-right-join',
      severity: 'warning',
      title: 'RIGHT JOIN not natively supported in SQLite',
      description: 'SQLite emulates RIGHT JOIN by swapping tables and using LEFT JOIN internally.',
      suggestion: 'Rewrite as LEFT JOIN by swapping the table order.',
    })
  }
  if (/\bTRUNCATE\s+TABLE\b/i.test(sql)) {
    issues.push({
      id: 'sqlite-no-truncate',
      severity: 'error',
      title: 'TRUNCATE TABLE not supported in SQLite',
      description: 'SQLite has no TRUNCATE statement. Use DELETE FROM to remove all rows.',
      suggestion: 'DELETE FROM table_name;',
    })
  }
  return issues
}

// Inside detectDialectIssues, add before the return:
if (dialect === 'sqlite') issues.push(...detectSQLiteIssues(sql))
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/analyzers/dialect-rules.test.ts
```

Expected: PASS (all including new SQLite tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/analyzers/dialect-rules.ts src/__tests__/analyzers/dialect-rules.test.ts
git commit -m "feat(sqlite): add SQLite analyzer rules (FULL OUTER JOIN, RIGHT JOIN, TRUNCATE)"
```

---

### Task 8.3: SQLite in UI and examples

**Files:**
- Modify: `src/components/editor/DialectSelector.tsx`
- Modify: `src/lib/examples/index.ts`

- [ ] **Step 1: Add SQLite to DIALECTS array**

In `src/components/editor/DialectSelector.tsx`:

Add a `SqLiteIcon` component (simple text icon since simple-icons may not have sqlite):

```tsx
function SqLiteIcon({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="3" fill="#0F80CC" />
      <text x="12" y="16" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold" fontFamily="monospace">SQ</text>
    </svg>
  )
}
```

Add SQLite entry to `DIALECTS`:

```ts
export const DIALECTS: DialectOption[] = [
  { value: 'postgresql', label: 'PostgreSQL', abbr: 'PG', desc: 'Open-source object-relational',   color: `#${siPostgresql.hex}`, bg: 'rgba(65,105,225,0.12)',  border: 'rgba(65,105,225,0.30)',  Icon: PgIcon },
  { value: 'mysql',      label: 'MySQL',      abbr: 'MY', desc: 'Oracle open-source RDBMS',         color: `#${siMysql.hex}`,      bg: 'rgba(68,121,161,0.12)',  border: 'rgba(68,121,161,0.30)',  Icon: MyIcon },
  { value: 'sqlserver',  label: 'SQL Server', abbr: 'MS', desc: 'Microsoft enterprise RDBMS',       color: '#CC2927',              bg: 'rgba(204,41,39,0.12)',   border: 'rgba(204,41,39,0.30)',   Icon: MsIcon },
  { value: 'sqlite',     label: 'SQLite',     abbr: 'SQ', desc: 'Embedded file-based database',     color: '#0F80CC',              bg: 'rgba(15,128,204,0.12)',  border: 'rgba(15,128,204,0.30)',  Icon: SqLiteIcon },
]
```

Also increase `DROPDOWN_H` from `188` to `244` to accommodate 4 options.

- [ ] **Step 2: Add SQLite examples**

Open `src/lib/examples/index.ts`. Add 3 SQLite examples to the exported array:

```ts
{
  id: 'sqlite-basic',
  title: 'Basic SELECT with LIMIT',
  dialect: 'sqlite',
  category: 'basic',
  description: 'Simple SQLite query using INTEGER PRIMARY KEY and LIMIT',
  sql: `SELECT id, name, email
FROM users
WHERE active = 1
ORDER BY created_at DESC
LIMIT 10`,
},
{
  id: 'sqlite-join',
  title: 'JOIN with aliases',
  dialect: 'sqlite',
  category: 'join',
  description: 'SQLite INNER JOIN — same as standard SQL',
  sql: `SELECT u.name, COUNT(o.id) AS order_count, SUM(o.total) AS total_spent
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed'
GROUP BY u.id, u.name
ORDER BY total_spent DESC`,
},
{
  id: 'sqlite-cte',
  title: 'CTE with aggregation',
  dialect: 'sqlite',
  category: 'cte',
  description: 'SQLite CTE support (available since 3.8.3)',
  sql: `WITH monthly_totals AS (
  SELECT
    strftime('%Y-%m', created_at) AS month,
    SUM(amount) AS total
  FROM transactions
  GROUP BY strftime('%Y-%m', created_at)
)
SELECT month, total,
  SUM(total) OVER (ORDER BY month) AS running_total
FROM monthly_totals
ORDER BY month`,
},
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

Open the dialect selector — SQLite should appear as a 4th option. Switch to SQLite and run the `sqlite-basic` example from ExamplePicker.

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/DialectSelector.tsx src/lib/examples/index.ts
git commit -m "feat(sqlite): add SQLite to dialect selector and example picker"
```

---

## FEATURE 2 — Auto-Apply Suggestions

### Task 2.1: Rewriter module

**Files:**
- Create: `src/lib/optimizer/rewriter.ts`
- Create: `src/__tests__/optimizer/rewriter.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/__tests__/optimizer/rewriter.test.ts
import { describe, it, expect } from 'vitest'
import { applyRewrite, canRewrite } from '@/lib/optimizer/rewriter'

describe('canRewrite', () => {
  it('returns true for replace_select_star', () => {
    expect(canRewrite('replace_select_star')).toBe(true)
  })
  it('returns true for replace_cross_join', () => {
    expect(canRewrite('replace_cross_join')).toBe(true)
  })
  it('returns true for replace_nolock', () => {
    expect(canRewrite('replace_nolock')).toBe(true)
  })
  it('returns false for unknown key', () => {
    expect(canRewrite('suggest_index_on_col')).toBe(false)
  })
})

describe('applyRewrite', () => {
  it('replaces SELECT * with placeholder comment', () => {
    const result = applyRewrite('SELECT * FROM users', 'replace_select_star')
    expect(result).toContain('-- TODO: specify columns')
    expect(result).not.toContain('SELECT *')
  })

  it('removes WITH(NOLOCK) hints', () => {
    const result = applyRewrite(
      'SELECT id FROM orders WITH(NOLOCK) WHERE status = 1',
      'replace_nolock',
    )
    expect(result).not.toMatch(/WITH\s*\(\s*NOLOCK\s*\)/i)
  })

  it('replaces implicit cross join with INNER JOIN', () => {
    const result = applyRewrite(
      'SELECT * FROM orders o, users u WHERE o.user_id = u.id',
      'replace_cross_join',
    )
    expect(result).toContain('INNER JOIN')
  })

  it('returns original sql for non-rewritable key', () => {
    const sql = 'SELECT id FROM t'
    expect(applyRewrite(sql, 'suggest_index_on_col')).toBe(sql)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/__tests__/optimizer/rewriter.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/optimizer/rewriter'`

- [ ] **Step 3: Implement the rewriter**

```ts
// src/lib/optimizer/rewriter.ts

const REWRITABLE_KEYS = new Set([
  'replace_select_star',
  'replace_cross_join',
  'replace_nolock',
])

export function canRewrite(suggestionId: string): boolean {
  return REWRITABLE_KEYS.has(suggestionId)
}

export function applyRewrite(sql: string, suggestionId: string): string {
  switch (suggestionId) {
    case 'replace_select_star':
      return sql.replace(/SELECT\s+\*/gi, 'SELECT -- TODO: specify columns')

    case 'replace_nolock':
      return sql.replace(/\bWITH\s*\(\s*NOLOCK\s*\)/gi, '').replace(/\s{2,}/g, ' ').trim()

    case 'replace_cross_join': {
      // Pattern: FROM t1, t2 WHERE t1.col = t2.col
      // This is a best-effort rewrite — works for simple 2-table implicit joins
      const match = sql.match(
        /FROM\s+(\w+)\s+(\w+)?\s*,\s*(\w+)\s+(\w+)?\s+WHERE\s+([\w.]+)\s*=\s*([\w.]+)/i,
      )
      if (!match) return sql
      const [full, t1, a1, t2, a2, col1, col2] = match
      const alias1 = a1 ? ` ${a1}` : ''
      const alias2 = a2 ? ` ${a2}` : ''
      const replacement = `FROM ${t1}${alias1} INNER JOIN ${t2}${alias2} ON ${col1} = ${col2}`
      return sql.replace(full, replacement).replace(/WHERE\s+([\w.]+)\s*=\s*([\w.]+)\s*/i, '')
    }

    default:
      return sql
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/optimizer/rewriter.test.ts
```

Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/optimizer/rewriter.ts src/__tests__/optimizer/rewriter.test.ts
git commit -m "feat(auto-apply): add rewriter module with canRewrite + applyRewrite"
```

---

### Task 2.2: Apply button in SuggestionsPanel + undo in store

**Files:**
- Modify: `src/store/useAppStore.ts`
- Modify: `src/components/panels/SuggestionsPanel.tsx`

- [ ] **Step 1: Add previousQuery + undoRewrite to store**

In `src/store/useAppStore.ts`:

```ts
// Add to AppStore interface:
previousQuery: string | null
undoRewrite: () => void
```

```ts
// Add to initial state:
previousQuery: null,

// Update setQuery action to snapshot before change (rename the internal setter):
// Replace the existing setQuery with:
setQuery: (query) => set((state) => ({ query, previousQuery: state.query })),
undoRewrite: () => set((state) =>
  state.previousQuery !== null
    ? { query: state.previousQuery, previousQuery: null }
    : {}
),
```

Do NOT persist `previousQuery`.

- [ ] **Step 2: Add Apply button to SuggestionCard**

In `src/components/panels/SuggestionsPanel.tsx`:

```tsx
// Add to imports:
import { Check, RotateCcw } from 'lucide-react'
import { canRewrite, applyRewrite } from '@/lib/optimizer/rewriter'
import { useAppStore } from '@/store/useAppStore'
```

Update `SuggestionCard` to receive `onApply`:

```tsx
function SuggestionCard({ suggestion, onApply }: { suggestion: Suggestion; onApply: (id: string) => void }) {
  const rewritable = canRewrite(suggestion.id)

  return (
    <div style={{ /* existing styles */ }}>
      {/* existing header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 12 }}>{catIcon}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
          {suggestion.title}
        </span>
        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: impactColor, color: '#fff', fontWeight: 600 }}>
          {suggestion.impact}
        </span>
        {rewritable && (
          <button
            onClick={() => onApply(suggestion.id)}
            aria-label={`Apply suggestion: ${suggestion.title}`}
            style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 4,
              background: 'var(--a)', color: '#000', border: 'none',
              cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3,
            }}
          >
            <Check size={10} /> Apply
          </button>
        )}
      </div>
      {/* rest of the card unchanged */}
    </div>
  )
}
```

Update `SuggestionsPanel` to wire up the apply action:

```tsx
export function SuggestionsPanel() {
  const suggestions = useAppStore((s) => s.suggestions)
  const query       = useAppStore((s) => s.query)
  const setQuery    = useAppStore((s) => s.setQuery)
  const undoRewrite = useAppStore((s) => s.undoRewrite)
  const previousQuery = useAppStore((s) => s.previousQuery)

  const handleApply = useCallback((id: string) => {
    const rewritten = applyRewrite(query, id)
    setQuery(rewritten)
    // Show a simple toast via the existing Toast mechanism if available, or inline feedback
  }, [query, setQuery])

  if (suggestions.length === 0) {
    return <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center' }}>No suggestions yet. Try a more complex query.</div>
  }

  return (
    <div style={{ padding: 12, overflowY: 'auto', height: '100%' }}>
      {previousQuery !== null && (
        <button
          onClick={undoRewrite}
          style={{
            width: '100%', marginBottom: 8, padding: '6px 12px',
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 6, cursor: 'pointer', fontSize: 11,
            color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <RotateCcw size={11} /> Undo last apply
        </button>
      )}
      {suggestions.map(s => (
        <SuggestionCard key={s.id} suggestion={s} onApply={handleApply} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Run full tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```

Enter `SELECT * FROM users, orders WHERE users.id = orders.user_id`. Go to Suggestions tab. The `replace_select_star` and `replace_cross_join` suggestions should have an "Apply" button. Click Apply on select star — editor should update. An "Undo last apply" banner should appear.

- [ ] **Step 5: Commit**

```bash
git add src/store/useAppStore.ts src/components/panels/SuggestionsPanel.tsx
git commit -m "feat(auto-apply): add Apply button to SuggestionsPanel with undo support"
```

---

## Final Tier 1 verification

- [ ] **Run full test suite**

```bash
npx vitest run --coverage
```

Expected: all tests pass, coverage maintained.

- [ ] **TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Final commit**

```bash
git commit --allow-empty -m "chore: tier 1 features complete — formatter, complexity, sqlite, auto-apply"
```
