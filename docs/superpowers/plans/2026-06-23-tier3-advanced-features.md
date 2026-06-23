# Tier 3 — Advanced Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 2 complex features — Schema-Aware Mode (new panel + analyzer + store integration) and Export Analysis Report (full HTML report with diagram, issues, lineage, and complexity).

**Prerequisites:** Tier 1 AND Tier 2 must be complete. In particular:
- `columnLineage` in store (from Feature 4, Tier 2)
- `complexityResult` in store (from Feature 7, Tier 1)
- All 4 dialects supported (Tier 1, Feature 8)

**Tech Stack:** React 19, TypeScript, Zustand, html-to-image (already installed), Lucide React, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-23-roadmap-features-design.md`

---

## FEATURE 3 — Schema-Aware Mode

### Task 3.1: Schema types and parser module

**Files:**
- Create: `src/lib/schema/types.ts`
- Create: `src/lib/schema/schema-parser.ts`
- Create: `src/__tests__/schema/schema-parser.test.ts`

- [ ] **Step 1: Create schema types**

```ts
// src/lib/schema/types.ts
export interface SchemaColumn {
  name:         string
  type:         string
  nullable:     boolean
  isPrimaryKey: boolean
  isForeignKey: boolean
  references?:  { table: string; column: string }
  isIndexed:    boolean
}

export interface SchemaTable {
  name:    string
  columns: SchemaColumn[]
  indexes: string[]  // column names that are indexed (beyond PK)
}

export type Schema = Record<string, SchemaTable>  // keyed by lowercase table name
```

- [ ] **Step 2: Write failing tests**

```ts
// src/__tests__/schema/schema-parser.test.ts
import { describe, it, expect } from 'vitest'
import { parseSchema } from '@/lib/schema/schema-parser'

const SIMPLE_DDL = `
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
`

describe('parseSchema', () => {
  it('parses table names', () => {
    const schema = parseSchema(SIMPLE_DDL)
    expect(schema).toHaveProperty('users')
    expect(schema).toHaveProperty('orders')
  })

  it('parses column names', () => {
    const schema = parseSchema(SIMPLE_DDL)
    const cols = schema['users']?.columns.map(c => c.name)
    expect(cols).toContain('id')
    expect(cols).toContain('email')
    expect(cols).toContain('name')
  })

  it('detects primary keys', () => {
    const schema = parseSchema(SIMPLE_DDL)
    const idCol = schema['users']?.columns.find(c => c.name === 'id')
    expect(idCol?.isPrimaryKey).toBe(true)
  })

  it('detects NOT NULL', () => {
    const schema = parseSchema(SIMPLE_DDL)
    const nameCol = schema['users']?.columns.find(c => c.name === 'name')
    expect(nameCol?.nullable).toBe(true)  // name has no NOT NULL
    const emailCol = schema['users']?.columns.find(c => c.name === 'email')
    expect(emailCol?.nullable).toBe(false)
  })

  it('detects foreign keys', () => {
    const schema = parseSchema(SIMPLE_DDL)
    const userIdCol = schema['orders']?.columns.find(c => c.name === 'user_id')
    expect(userIdCol?.isForeignKey).toBe(true)
    expect(userIdCol?.references?.table).toBe('users')
  })

  it('detects CREATE INDEX', () => {
    const schema = parseSchema(SIMPLE_DDL)
    expect(schema['orders']?.indexes).toContain('user_id')
  })

  it('returns empty object for empty input', () => {
    expect(parseSchema('')).toEqual({})
    expect(parseSchema('   ')).toEqual({})
  })
})
```

- [ ] **Step 3: Run to verify failure**

```bash
npx vitest run src/__tests__/schema/schema-parser.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/schema/schema-parser'`

- [ ] **Step 4: Implement schema-parser**

```ts
// src/lib/schema/schema-parser.ts
import type { Schema, SchemaTable, SchemaColumn } from './types'

function normalizeName(name: string): string {
  return name.replace(/[`"[\]]/g, '').toLowerCase()
}

export function parseSchema(ddl: string): Schema {
  if (!ddl.trim()) return {}

  const schema: Schema = {}

  // ── Parse CREATE TABLE blocks ─────────────────────────────────────────────
  const tableBlocks = ddl.matchAll(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"[\]\w.]+)\s*\(([^;]+)\)/gi,
  )

  for (const [, rawName, body] of tableBlocks) {
    const tableName = normalizeName(rawName)
    const columns: SchemaColumn[] = []
    const indexes: string[] = []

    // Split body on commas that are NOT inside parentheses
    const parts: string[] = []
    let depth = 0
    let current = ''
    for (const ch of body) {
      if (ch === '(') depth++
      else if (ch === ')') depth--
      else if (ch === ',' && depth === 0) { parts.push(current.trim()); current = ''; continue }
      current += ch
    }
    if (current.trim()) parts.push(current.trim())

    // Collect table-level PKs and FKs
    const tablePKCols = new Set<string>()
    const tableFKMap: Record<string, { table: string; column: string }> = {}

    for (const part of parts) {
      // Table-level PRIMARY KEY(col1, col2, ...)
      const pkMatch = part.match(/^PRIMARY\s+KEY\s*\(([^)]+)\)/i)
      if (pkMatch) {
        pkMatch[1].split(',').map(c => normalizeName(c.trim())).forEach(c => tablePKCols.add(c))
        continue
      }
      // Table-level FOREIGN KEY(col) REFERENCES table(col)
      const fkMatch = part.match(/^(?:CONSTRAINT\s+\w+\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([`"[\]\w]+)\s*\(([^)]+)\)/i)
      if (fkMatch) {
        const fkCol   = normalizeName(fkMatch[1].trim())
        const refTable = normalizeName(fkMatch[2].trim())
        const refCol   = normalizeName(fkMatch[3].trim())
        tableFKMap[fkCol] = { table: refTable, column: refCol }
        continue
      }
    }

    // Parse column definitions
    for (const part of parts) {
      // Skip constraint-only lines
      if (/^(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|CONSTRAINT|INDEX)\b/i.test(part)) continue

      // Column: name type [constraints...]
      const colMatch = part.match(/^([`"[\]\w]+)\s+(\w[\w\s(,)]*?)(?:\s+(.*?))?$/i)
      if (!colMatch) continue

      const colName = normalizeName(colMatch[1])
      const colType = colMatch[2]?.trim().split(/\s+/)[0]?.replace(/\(.*\)/, '') ?? ''
      const rest    = (colMatch[3] ?? '').toUpperCase()

      // Inline REFERENCES
      const inlineRefMatch = part.match(/REFERENCES\s+([`"[\]\w]+)\s*\(([^)]+)\)/i)

      const col: SchemaColumn = {
        name:         colName,
        type:         colType.toUpperCase(),
        nullable:     !rest.includes('NOT NULL') && !rest.includes('PRIMARY KEY'),
        isPrimaryKey: rest.includes('PRIMARY KEY') || tablePKCols.has(colName),
        isForeignKey: !!inlineRefMatch || !!tableFKMap[colName],
        isIndexed:    rest.includes('PRIMARY KEY') || rest.includes('UNIQUE'),
        references:   inlineRefMatch
          ? { table: normalizeName(inlineRefMatch[1]), column: normalizeName(inlineRefMatch[2].trim()) }
          : tableFKMap[colName],
      }

      if (rest.includes('UNIQUE')) indexes.push(colName)
      columns.push(col)
    }

    schema[tableName] = { name: tableName, columns, indexes }
  }

  // ── Parse CREATE INDEX statements ─────────────────────────────────────────
  const indexStmts = ddl.matchAll(
    /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?\w+\s+ON\s+([`"[\]\w]+)\s*\(([^)]+)\)/gi,
  )
  for (const [, rawTable, rawCols] of indexStmts) {
    const tableName = normalizeName(rawTable)
    if (schema[tableName]) {
      rawCols.split(',').map(c => normalizeName(c.trim())).forEach(col => {
        if (!schema[tableName].indexes.includes(col)) {
          schema[tableName].indexes.push(col)
        }
        // Mark the column as indexed
        const colDef = schema[tableName].columns.find(c => c.name === col)
        if (colDef) colDef.isIndexed = true
      })
    }
  }

  return schema
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/schema/schema-parser.test.ts
```

Expected: PASS (7 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/schema/types.ts src/lib/schema/schema-parser.ts src/__tests__/schema/schema-parser.test.ts
git commit -m "feat(schema): add schema types and DDL parser module"
```

---

### Task 3.2: Schema validator analyzer

**Files:**
- Create: `src/lib/analyzers/schema-validator.ts`
- Create: `src/__tests__/analyzers/schema-validator.test.ts`
- Modify: `src/lib/analyzers/index.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/__tests__/analyzers/schema-validator.test.ts
import { describe, it, expect } from 'vitest'
import { validateAgainstSchema } from '@/lib/analyzers/schema-validator'
import type { Schema } from '@/lib/schema/types'
import { parseSQL } from '@/lib/parser'

const SCHEMA: Schema = {
  users: {
    name: 'users',
    columns: [
      { name: 'id',    type: 'INTEGER', nullable: false, isPrimaryKey: true,  isForeignKey: false, isIndexed: true },
      { name: 'email', type: 'VARCHAR', nullable: false, isPrimaryKey: false, isForeignKey: false, isIndexed: true },
      { name: 'name',  type: 'VARCHAR', nullable: true,  isPrimaryKey: false, isForeignKey: false, isIndexed: false },
    ],
    indexes: ['id', 'email'],
  },
  orders: {
    name: 'orders',
    columns: [
      { name: 'id',      type: 'INTEGER', nullable: false, isPrimaryKey: true,  isForeignKey: false, isIndexed: true  },
      { name: 'user_id', type: 'INTEGER', nullable: false, isPrimaryKey: false, isForeignKey: true,  isIndexed: false },
      { name: 'total',   type: 'DECIMAL', nullable: false, isPrimaryKey: false, isForeignKey: false, isIndexed: false },
    ],
    indexes: ['id'],
  },
}

describe('validateAgainstSchema', () => {
  it('flags a column that does not exist in the schema', () => {
    const result = parseSQL('SELECT u.nonexistent_col FROM users u', 'postgresql')
    if (!result) return
    const issues = validateAgainstSchema(result.rawAst, SCHEMA)
    expect(issues.some(i => i.severity === 'error' && i.title.toLowerCase().includes('nonexistent_col'))).toBe(true)
  })

  it('does not flag valid columns', () => {
    const result = parseSQL('SELECT u.id, u.email FROM users u', 'postgresql')
    if (!result) return
    const issues = validateAgainstSchema(result.rawAst, SCHEMA)
    const errors = issues.filter(i => i.severity === 'error')
    expect(errors).toHaveLength(0)
  })

  it('warns about JOIN on non-indexed column', () => {
    const result = parseSQL(
      'SELECT o.total FROM orders o JOIN users u ON o.user_id = u.id',
      'postgresql',
    )
    if (!result) return
    const issues = validateAgainstSchema(result.rawAst, SCHEMA)
    // user_id has no index in SCHEMA → warning
    expect(issues.some(i => i.severity === 'warning' && i.description.toLowerCase().includes('index'))).toBe(true)
  })

  it('returns empty array when schema is null', () => {
    const result = parseSQL('SELECT id FROM users', 'postgresql')
    if (!result) return
    const issues = validateAgainstSchema(result.rawAst, null)
    expect(issues).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/__tests__/analyzers/schema-validator.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/analyzers/schema-validator'`

- [ ] **Step 3: Implement schema-validator**

```ts
// src/lib/analyzers/schema-validator.ts
import type { Issue } from '@/types'
import type { Schema } from '@/lib/schema/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function collectColumnRefs(node: any, refs: { table: string; column: string }[]): void {
  if (!node || typeof node !== 'object') return

  if (node.type === 'column_ref') {
    if (node.column && node.column !== '*') {
      refs.push({
        table:  (node.table ?? '').toLowerCase(),
        column: (typeof node.column === 'string' ? node.column : String(node.column)).toLowerCase(),
      })
    }
    return
  }

  if (Array.isArray(node)) {
    for (const child of node) collectColumnRefs(child, refs)
    return
  }

  for (const key of Object.keys(node)) {
    if (key === 'type') continue
    collectColumnRefs(node[key], refs)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function collectJoinConditions(node: any): { leftTable: string; leftCol: string; rightTable: string; rightCol: string }[] {
  if (!node || typeof node !== 'object') return []
  const joins: ReturnType<typeof collectJoinConditions> = []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function walk(n: any) {
    if (!n || typeof n !== 'object') return
    if (n.join && n.on?.type === 'binary_expr' && n.on.left?.type === 'column_ref' && n.on.right?.type === 'column_ref') {
      joins.push({
        leftTable:  (n.on.left.table  ?? '').toLowerCase(),
        leftCol:    (n.on.left.column  ?? '').toLowerCase(),
        rightTable: (n.on.right.table ?? '').toLowerCase(),
        rightCol:   (n.on.right.column ?? '').toLowerCase(),
      })
    }
    if (Array.isArray(n)) n.forEach(walk)
    else Object.values(n).forEach(walk)
  }
  walk(node)
  return joins
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildTableAliasMap(rawAst: any): Record<string, string> {
  const map: Record<string, string> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function walk(node: any) {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) { node.forEach(walk); return }
    // { table, as } in FROM clause
    if (node.table && node.as) {
      map[node.as.toLowerCase()] = node.table.toLowerCase()
    }
    Object.values(node).forEach(walk)
  }
  walk(rawAst)
  return map
}

export function validateAgainstSchema(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawAst: unknown,
  schema: Schema | null,
): Issue[] {
  if (!schema || !rawAst) return []

  const issues: Issue[] = []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ast = rawAst as any
  const aliases = buildTableAliasMap(ast)

  // ── Column existence check ───────────────────────────────────────────────
  const refs: { table: string; column: string }[] = []
  collectColumnRefs(ast, refs)

  for (const ref of refs) {
    if (!ref.table) continue  // unqualified column refs — skip (ambiguous)
    const tableName = aliases[ref.table] ?? ref.table
    const tableDef  = schema[tableName]
    if (!tableDef) continue  // table not in schema — not our problem (might be subquery alias)

    const colExists = tableDef.columns.some(c => c.name === ref.column)
    if (!colExists) {
      issues.push({
        id:          `schema-col-missing-${tableName}-${ref.column}`,
        severity:    'error',
        title:       `Column '${ref.column}' not found in '${tableName}'`,
        description: `Column '${ref.column}' does not exist in table '${tableName}'. Check for typos or missing migrations.`,
        suggestion:  `Available columns: ${tableDef.columns.map(c => c.name).join(', ')}`,
      })
    }
  }

  // ── JOIN on non-indexed column ───────────────────────────────────────────
  const joinConds = collectJoinConditions(ast)
  for (const { leftTable, leftCol, rightTable, rightCol } of joinConds) {
    const leftReal  = aliases[leftTable]  ?? leftTable
    const rightReal = aliases[rightTable] ?? rightTable

    for (const [tName, col] of [[leftReal, leftCol], [rightReal, rightCol]] as [string, string][]) {
      const tableDef = schema[tName]
      if (!tableDef) continue
      const colDef = tableDef.columns.find(c => c.name === col)
      if (!colDef) continue
      if (!colDef.isIndexed && !tableDef.indexes.includes(col)) {
        issues.push({
          id:          `schema-join-no-index-${tName}-${col}`,
          severity:    'warning',
          title:       `JOIN on '${tName}.${col}' — no index`,
          description: `The column '${col}' in '${tName}' is used in a JOIN condition but has no index. This may cause a full table scan.`,
          suggestion:  `CREATE INDEX idx_${tName}_${col} ON ${tName}(${col});`,
        })
      }
    }
  }

  return issues
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/analyzers/schema-validator.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Wire schema-validator into runAnalyzers**

In `src/lib/analyzers/index.ts`:

```ts
// Add import:
import { validateAgainstSchema } from './schema-validator'
import type { Schema } from '@/lib/schema/types'

// Update signature:
export function runAnalyzers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ast: any,
  sql: string,
  dialect: Dialect,
  schema: Schema | null = null,   // NEW optional param
): Issue[] {
  const issues: Issue[] = [
    ...detectAntiPatterns(ast),
    ...detectLocks(sql, dialect),
    ...detectPerformanceIssues(ast, sql),
    ...detectDialectIssues(ast, sql, dialect),
    ...validateAgainstSchema(ast, schema),  // NEW
  ]
  return issues
}
```

Note: `useParseQuery.ts` is updated in Task 3.3 Step 2 — do not update it here.

- [ ] **Step 6: Commit**

```bash
git add src/lib/analyzers/schema-validator.ts src/__tests__/analyzers/schema-validator.test.ts src/lib/analyzers/index.ts
git commit -m "feat(schema): add schema-validator analyzer with column existence and join index checks"
```

---

### Task 3.3: Schema in store and SchemaPanel UI

**Files:**
- Modify: `src/store/useAppStore.ts`
- Create: `src/components/panels/SchemaPanel.tsx`
- Modify: `src/components/layout/PanelRight.tsx`
- Modify: `src/hooks/useParseQuery.ts`

- [ ] **Step 1: Add schema to store**

In `src/store/useAppStore.ts`:

```ts
// Add imports:
import type { Schema } from '@/lib/schema/types'
import { parseSchema } from '@/lib/schema/schema-parser'

// Add to interface:
schema:    Schema | null
loadSchema: (ddl: string) => void
clearSchema: () => void
```

```ts
// Add to initial state:
schema: null,

// Actions:
loadSchema: (ddl) => set({ schema: parseSchema(ddl) }),
clearSchema: () => set({ schema: null }),
```

Do NOT persist `schema`.

- [ ] **Step 2: Pass schema to runAnalyzers in useParseQuery**

In `src/hooks/useParseQuery.ts`:

```ts
// Get schema from store:
const schema = useAppStore((s) => s.schema)

// Pass it to runAnalyzers:
const issues = runAnalyzers(result.rawAst, query, dialect, schema)
```

Also add `schema` to the dependency array of the effect / callback that triggers re-parse so issues update when schema changes without needing to re-type the query.

- [ ] **Step 3: Create SchemaPanel**

```tsx
// src/components/panels/SchemaPanel.tsx
import { useState } from 'react'
import { Upload, X, Database, ChevronDown, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

function TableTree({ tableName, table }: { tableName: string; table: { columns: { name: string; type: string; nullable: boolean; isPrimaryKey: boolean; isForeignKey: boolean; isIndexed: boolean }[]; indexes: string[] } }) {
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
          {table.columns.map(col => (
            <div key={col.name} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 6px', fontSize: 10 }}>
              <span style={{ color: col.isPrimaryKey ? '#EF9F27' : col.isForeignKey ? '#9B59B6' : 'var(--text-2)', fontFamily: 'monospace', flex: 1 }}>
                {col.name}
              </span>
              <span style={{ color: 'var(--text-3)', fontFamily: 'monospace' }}>{col.type}</span>
              {col.isPrimaryKey && <span style={{ fontSize: 8, padding: '0 3px', background: '#EF9F2733', color: '#EF9F27', borderRadius: 2 }}>PK</span>}
              {col.isForeignKey && <span style={{ fontSize: 8, padding: '0 3px', background: '#9B59B633', color: '#9B59B6', borderRadius: 2 }}>FK</span>}
              {col.isIndexed && !col.isPrimaryKey && <span style={{ fontSize: 8, padding: '0 3px', background: '#1D9E7533', color: '#1D9E75', borderRadius: 2 }}>IX</span>}
              {col.nullable && <span style={{ fontSize: 8, color: 'var(--text-3)' }}>null</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function SchemaPanel() {
  const schema     = useAppStore((s) => s.schema)
  const loadSchema = useAppStore((s) => s.loadSchema)
  const clearSchema = useAppStore((s) => s.clearSchema)
  const [ddl, setDdl]   = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleLoad = () => {
    if (!ddl.trim()) { setError('Paste a CREATE TABLE statement first'); return }
    try {
      loadSchema(ddl)
      setError(null)
    } catch (e) {
      setError('Could not parse DDL. Check the syntax and try again.')
    }
  }

  if (schema && Object.keys(schema).length > 0) {
    const tables = Object.entries(schema)
    return (
      <div style={{ padding: 12, overflowY: 'auto', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--text-2)' }}>
            {tables.length} table{tables.length !== 1 ? 's' : ''} loaded
          </span>
          <button
            onClick={clearSchema}
            aria-label="Clear schema"
            style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'none', border: '1px solid var(--border)', cursor: 'pointer', color: '#E24B4A', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <X size={10} /> Clear
          </button>
        </div>
        {tables.map(([name, table]) => (
          <TableTree key={name} tableName={name} table={table} />
        ))}
      </div>
    )
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
        style={{
          flex: 1, width: '100%', minHeight: 180,
          padding: '8px 10px', borderRadius: 6, resize: 'vertical',
          background: 'var(--surface)', border: '1px solid var(--border)',
          color: 'var(--text-1)', fontSize: 11, fontFamily: 'monospace',
          outline: 'none', boxSizing: 'border-box',
        }}
      />
      {error && (
        <p style={{ fontSize: 10, color: '#E24B4A', margin: 0 }}>{error}</p>
      )}
      <button
        onClick={handleLoad}
        style={{ padding: '7px 12px', borderRadius: 6, background: 'var(--a)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#000', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
      >
        <Upload size={12} /> Load Schema
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Add Schema tab to PanelRight**

In `src/components/layout/PanelRight.tsx`:

```tsx
// Add import:
import { SchemaPanel } from '@/components/panels/SchemaPanel'

// After Suggestions trigger in TabsList:
<TabsTrigger value="schema" style={{ fontSize: 11, padding: '3px 10px' }}>
  Schema
</TabsTrigger>

// After Suggestions content:
<TabsContent value="schema" style={{ height: '100%', margin: 0, overflow: 'auto' }}>
  <SchemaPanel />
</TabsContent>
```

- [ ] **Step 5: Verify in browser**

```bash
npm run dev
```

Open Schema tab. Paste DDL:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(100)
);
```

Click "Load Schema". Table tree should appear. Now enter `SELECT u.nonexistent FROM users u` in the editor — Issues tab should show an error about `nonexistent` column.

- [ ] **Step 6: Commit**

```bash
git add src/store/useAppStore.ts src/components/panels/SchemaPanel.tsx src/components/layout/PanelRight.tsx src/hooks/useParseQuery.ts
git commit -m "feat(schema): add SchemaPanel, schema store integration, and schema-aware issue reporting"
```

---

## FEATURE 9 — Export Analysis Report

### Task 9.1: Report generator module

**Files:**
- Create: `src/lib/report/report-generator.ts`
- Create: `src/__tests__/report/report-generator.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/__tests__/report/report-generator.test.ts
import { describe, it, expect } from 'vitest'
import { generateReportHTML } from '@/lib/report/report-generator'
import type { Issue, Suggestion } from '@/types'
import type { ColumnLineage } from '@/lib/lineage/column-lineage'
import type { ComplexityResult } from '@/lib/complexity/complexity-score'

const MOCK_COMPLEXITY: ComplexityResult = {
  score: 5,
  level: 'Moderate',
  breakdown: { tableCount: 2, joinCount: 1, subqueryCount: 0, cteCount: 0, setOpCount: 0, procedureCount: 0, aggregateCount: 1, conditionCount: 0, loopCount: 0 },
}

const MOCK_ISSUES: Issue[] = [
  { id: 'i1', severity: 'error', title: 'SELECT *', description: 'Avoid SELECT *', suggestion: 'Specify columns' },
]

const MOCK_SUGGESTIONS: Suggestion[] = [
  { id: 's1', category: 'rewrite', title: 'Replace SELECT *', before: 'SELECT *', after: 'SELECT id, name', impact: 'high', reason: 'Better performance' },
]

const MOCK_LINEAGE: ColumnLineage = [
  { outputAlias: 'id', sources: [{ table: 'users', column: 'id' }] },
]

describe('generateReportHTML', () => {
  it('returns a non-empty HTML string', () => {
    const html = generateReportHTML({
      sql: 'SELECT * FROM users',
      dialect: 'postgresql',
      diagramDataUrl: null,
      complexity: MOCK_COMPLEXITY,
      issues: MOCK_ISSUES,
      suggestions: MOCK_SUGGESTIONS,
      lineage: MOCK_LINEAGE,
    })
    expect(html).toBeTruthy()
    expect(html).toContain('<html')
    expect(html).toContain('</html>')
  })

  it('includes the SQL in the output', () => {
    const html = generateReportHTML({
      sql: 'SELECT id FROM users',
      dialect: 'postgresql',
      diagramDataUrl: null,
      complexity: MOCK_COMPLEXITY,
      issues: [],
      suggestions: [],
      lineage: [],
    })
    expect(html).toContain('SELECT id FROM users')
  })

  it('includes issues section when issues present', () => {
    const html = generateReportHTML({
      sql: 'SELECT * FROM users',
      dialect: 'postgresql',
      diagramDataUrl: null,
      complexity: MOCK_COMPLEXITY,
      issues: MOCK_ISSUES,
      suggestions: [],
      lineage: [],
    })
    expect(html).toContain('SELECT *')
    expect(html).toContain('Avoid SELECT *')
  })

  it('includes lineage section when lineage present', () => {
    const html = generateReportHTML({
      sql: 'SELECT id FROM users',
      dialect: 'postgresql',
      diagramDataUrl: null,
      complexity: MOCK_COMPLEXITY,
      issues: [],
      suggestions: [],
      lineage: MOCK_LINEAGE,
    })
    expect(html).toContain('users')
  })

  it('skips diagram section when diagramDataUrl is null', () => {
    const html = generateReportHTML({
      sql: 'SELECT 1',
      dialect: 'postgresql',
      diagramDataUrl: null,
      complexity: MOCK_COMPLEXITY,
      issues: [],
      suggestions: [],
      lineage: [],
    })
    expect(html).not.toContain('<img')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/__tests__/report/report-generator.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/report/report-generator'`

- [ ] **Step 3: Implement report-generator**

```ts
// src/lib/report/report-generator.ts
import type { Issue, Suggestion, Dialect } from '@/types'
import type { ColumnLineage } from '@/lib/lineage/column-lineage'
import type { ComplexityResult } from '@/lib/complexity/complexity-score'

export interface ReportInput {
  sql:            string
  dialect:        Dialect
  diagramDataUrl: string | null
  complexity:     ComplexityResult | null
  issues:         Issue[]
  suggestions:    Suggestion[]
  lineage:        ColumnLineage
}

const LEVEL_COLOR: Record<string, string> = {
  Simple:        '#1D9E75',
  Moderate:      '#EF9F27',
  Complex:       '#E07B39',
  'Very Complex': '#E24B4A',
}

const SEV_COLOR: Record<string, string> = {
  error:   '#E24B4A',
  warning: '#EF9F27',
  info:    '#4A90D9',
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function generateReportHTML(input: ReportInput): string {
  const { sql, dialect, diagramDataUrl, complexity, issues, suggestions, lineage } = input
  const now = new Date().toLocaleString()
  const firstTable = sql.match(/FROM\s+(\w+)/i)?.[1] ?? 'query'
  const title = `${firstTable} — SQL Analysis Report`

  const errCount  = issues.filter(i => i.severity === 'error').length
  const warnCount = issues.filter(i => i.severity === 'warning').length

  const issuesHtml = issues.length === 0 ? '' : `
<section>
  <h2>Issues (${issues.length})</h2>
  ${issues.map(i => `
  <div class="card issue-${i.severity}">
    <span class="badge" style="background:${SEV_COLOR[i.severity]}">${i.severity.toUpperCase()}</span>
    <strong>${escHtml(i.title)}</strong>
    <p>${escHtml(i.description)}</p>
    ${i.suggestion ? `<p class="suggestion"><em>Suggestion:</em> ${escHtml(i.suggestion)}</p>` : ''}
  </div>`).join('')}
</section>`

  const suggestionsHtml = suggestions.length === 0 ? '' : `
<section>
  <h2>Optimization Suggestions</h2>
  ${suggestions.map(s => `
  <div class="card">
    <strong>${escHtml(s.title)}</strong>
    <span class="badge impact-${s.impact}">${s.impact.toUpperCase()} IMPACT</span>
    <p>${escHtml(s.reason)}</p>
    <div class="code-compare">
      <div><div class="label">Before</div><pre class="before">${escHtml(s.before)}</pre></div>
      <div><div class="label">After</div><pre class="after">${escHtml(s.after)}</pre></div>
    </div>
  </div>`).join('')}
</section>`

  const lineageHtml = lineage.length === 0 ? '' : `
<section>
  <h2>Column Lineage</h2>
  <table>
    <thead><tr><th>Output Column</th><th>Expression</th><th>Source(s)</th></tr></thead>
    <tbody>
    ${lineage.map(e => `
    <tr>
      <td><code>${escHtml(e.outputAlias)}</code></td>
      <td>${e.expression ? `<code>${escHtml(e.expression)}</code>` : '—'}</td>
      <td>${e.sources.map(s => `<code>${s.table ? escHtml(s.table) + '.' : ''}${escHtml(s.column)}</code>`).join(', ')}</td>
    </tr>`).join('')}
    </tbody>
  </table>
</section>`

  const complexityHtml = !complexity ? '' : `
<section>
  <h2>Complexity Analysis</h2>
  <div class="complexity-badge" style="border-color:${LEVEL_COLOR[complexity.level] ?? '#888'}; color:${LEVEL_COLOR[complexity.level] ?? '#888'}">
    ${escHtml(complexity.level)} — Score ${complexity.score}
  </div>
  <table>
    <thead><tr><th>Factor</th><th>Count</th></tr></thead>
    <tbody>
    ${Object.entries(complexity.breakdown).filter(([,v]) => v > 0).map(([k, v]) => `
    <tr><td>${escHtml(k.replace(/([A-Z])/g, ' $1').trim())}</td><td>${v}</td></tr>`).join('')}
    </tbody>
  </table>
</section>`

  const diagramHtml = diagramDataUrl ? `
<section>
  <h2>Execution Diagram</h2>
  <img src="${diagramDataUrl}" alt="SQL execution diagram" style="max-width:100%; border-radius:6px; border:1px solid #e2e8f0" />
</section>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #1a202c; background: #fff; padding: 32px; max-width: 860px; margin: 0 auto; }
    h1 { font-size: 22px; margin-bottom: 4px; color: #1a202c }
    h2 { font-size: 16px; margin: 24px 0 12px; color: #2d3748; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px }
    .meta { font-size: 12px; color: #718096; margin-bottom: 24px }
    .meta span { margin-right: 16px }
    section { margin-bottom: 28px }
    .card { padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 10px; position: relative }
    pre { font-family: 'SFMono-Regular', Consolas, monospace; font-size: 12px; padding: 10px 12px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; word-break: break-all }
    code { font-family: monospace; font-size: 12px }
    .sql-block { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 6px }
    .badge { font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 10px; color: #fff; display: inline-block; margin-right: 6px; vertical-align: middle }
    .before { background: #fff5f5; color: #c53030 }
    .after  { background: #f0fff4; color: #276749 }
    .code-compare { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px }
    .label { font-size: 10px; color: #718096; margin-bottom: 3px }
    table { width: 100%; border-collapse: collapse; font-size: 13px }
    th { text-align: left; padding: 7px 10px; background: #f7fafc; border: 1px solid #e2e8f0; font-size: 11px; color: #4a5568 }
    td { padding: 7px 10px; border: 1px solid #e2e8f0 }
    tr:nth-child(even) td { background: #f7fafc }
    .complexity-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; border: 2px solid; font-weight: 700; margin-bottom: 12px }
    .issue-error  { border-left: 3px solid #E24B4A }
    .issue-warning { border-left: 3px solid #EF9F27 }
    .issue-info   { border-left: 3px solid #4A90D9 }
    .suggestion { margin-top: 6px; font-size: 12px; color: #4a5568 }
    .impact-high   { background: #E24B4A }
    .impact-medium { background: #EF9F27 }
    .impact-low    { background: #1D9E75 }
    @media print {
      body { padding: 0 }
      section { break-inside: avoid }
    }
  </style>
</head>
<body>
  <h1>${escHtml(title)}</h1>
  <div class="meta">
    <span>Dialect: ${escHtml(dialect.toUpperCase())}</span>
    <span>Generated: ${escHtml(now)}</span>
    ${errCount > 0 ? `<span style="color:#E24B4A">${errCount} error${errCount !== 1 ? 's' : ''}</span>` : ''}
    ${warnCount > 0 ? `<span style="color:#EF9F27">${warnCount} warning${warnCount !== 1 ? 's' : ''}</span>` : ''}
  </div>

  <section>
    <h2>SQL Query</h2>
    <pre class="sql-block">${escHtml(sql)}</pre>
  </section>

  ${diagramHtml}
  ${complexityHtml}
  ${issuesHtml}
  ${suggestionsHtml}
  ${lineageHtml}
</body>
</html>`
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/report/report-generator.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/report/report-generator.ts src/__tests__/report/report-generator.test.ts
git commit -m "feat(report): add generateReportHTML module"
```

---

### Task 9.2: Export report button and hook integration

**Files:**
- Modify: `src/hooks/useExport.ts`
- Modify: `src/components/diagram/ExportButton.tsx`

- [ ] **Step 1: Read current useExport hook**

```bash
cat src/hooks/useExport.ts
```

Note the current export function signature and how it captures the diagram element.

- [ ] **Step 2: Add exportReport to useExport**

In `src/hooks/useExport.ts`, add an `exportReport` function that:
1. Captures the diagram as a PNG data URL
2. Gathers state from the store
3. Calls `generateReportHTML`
4. Opens the result in a new tab

```ts
// Add imports at top of useExport.ts:
import { generateReportHTML } from '@/lib/report/report-generator'
import { useAppStore } from '@/store/useAppStore'
import { toPng } from 'html-to-image'

// Inside the hook, after existing exports, add:
const issues        = useAppStore((s) => s.issues)
const suggestions   = useAppStore((s) => s.suggestions)
const columnLineage = useAppStore((s) => s.columnLineage)
const complexityResult = useAppStore((s) => s.complexityResult)
const query         = useAppStore((s) => s.query)
const dialect       = useAppStore((s) => s.dialect)

const exportReport = useCallback(async () => {
  // Capture diagram as PNG (reuse existing diagram element ref from the hook)
  let diagramDataUrl: string | null = null
  try {
    const el = document.querySelector('.react-flow') as HTMLElement | null
    if (el) diagramDataUrl = await toPng(el, { backgroundColor: '#0d0d12', pixelRatio: 1.5 })
  } catch { /* ignore if capture fails */ }

  const html = generateReportHTML({
    sql:            query,
    dialect,
    diagramDataUrl,
    complexity:     complexityResult,
    issues,
    suggestions,
    lineage:        columnLineage,
  })

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}, [query, dialect, issues, suggestions, columnLineage, complexityResult])

return { /* ...existing exports..., */ exportReport }
```

- [ ] **Step 3: Add Export Report button to ExportButton component**

Open `src/components/diagram/ExportButton.tsx`. Add a "Report" option alongside the existing PNG/SVG buttons:

```tsx
// Add import:
import { FileText } from 'lucide-react'

// Add to the existing button group (exact placement depends on current ExportButton structure):
<button
  onClick={() => { exportReport() }}
  aria-label="Export analysis report (HTML)"
  title="Export as report (HTML → PDF)"
  style={{
    /* match existing button style in ExportButton */
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '5px 10px', borderRadius: 5, fontSize: 11,
    background: 'var(--elevated)', border: '1px solid var(--border)',
    cursor: 'pointer', color: 'var(--text-2)',
  }}
>
  <FileText size={12} /> Report
</button>
```

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```

Enter a complex query with JOINs. Click the Report button. A new tab should open with a clean HTML report showing the SQL, complexity score, issues, suggestions, and column lineage. In Chrome/Firefox, pressing Ctrl+P should produce a clean print layout.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run --coverage
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useExport.ts src/components/diagram/ExportButton.tsx
git commit -m "feat(report): add exportReport to useExport hook and Report button to ExportButton"
```

---

## Final Tier 3 verification

- [ ] **Run full test suite**

```bash
npx vitest run --coverage
```

Expected: all tests pass.

- [ ] **TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **End-to-end smoke test**

Open the app and verify:

1. Schema tab loads DDL and shows tree view
2. Issues update when schema has column validation errors
3. Lineage tab shows column sources
4. Export Report opens a new tab with complete analysis
5. Report includes diagram image if diagram has nodes
6. Print (Ctrl+P) produces clean PDF layout

- [ ] **Final commit**

```bash
git commit --allow-empty -m "chore: tier 3 features complete — schema-aware mode and export report"
```

---

## Full Roadmap Complete

All 10 features shipped across 3 tiers:

| # | Feature | Tier | Status |
|---|---------|------|--------|
| 6 | Query Formatter | 1 | ✅ |
| 7 | Complexity Score | 1 | ✅ |
| 8 | SQLite Dialect | 1 | ✅ |
| 2 | Auto-Apply Suggestions | 1 | ✅ |
| 1 | MERGE/PIVOT/UNPIVOT | 2 | ✅ |
| 4 | Column Lineage | 2 | ✅ |
| 10 | Query Collections | 2 | ✅ |
| 5 | Cross-Dialect Conversion | 2 | ✅ |
| 3 | Schema-Aware Mode | 3 | ✅ |
| 9 | Export Analysis Report | 3 | ✅ |
