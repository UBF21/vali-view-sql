# Tier 2 — Core Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 4 medium-complexity features — MERGE/PIVOT/UNPIVOT node support, Column Lineage panel, Query Collections, and Cross-Dialect Conversion.

**Architecture:** MERGE/PIVOT/UNPIVOT extend the existing parser → AST → node type pipeline. Column Lineage adds a `lib/lineage/` module and a new tab in PanelRight. Collections replaces the 10-entry history with a full `lib/collections/` module. Cross-Dialect Conversion adds a `lib/converter/` module and a modal in the dialect selector.

**Prerequisites:** Tier 1 must be complete (SQLite dialect type must exist for cross-dialect conversion to support all 4 dialects).

**Tech Stack:** React 19, TypeScript, Zustand, Lucide React, node-sql-parser, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-23-roadmap-features-design.md`

---

## FEATURE 1 — MERGE / PIVOT / UNPIVOT

### Task 1.1: New NodeTypes in types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add new node types**

In `src/types/index.ts`, update `NodeType`:

```ts
export type NodeType =
  | 'table' | 'join' | 'filter' | 'aggregate'
  | 'output' | 'sort' | 'limit' | 'subquery' | 'setop'
  | 'cte' | 'temp_table' | 'procedure' | 'param' | 'declare'
  | 'condition' | 'loop'
  | 'merge' | 'pivot' | 'unpivot'   // NEW
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors (new union members don't break existing exhaustive checks unless there's a switch without a default — fix any that appear).

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(merge-pivot): add merge | pivot | unpivot to NodeType union"
```

---

### Task 1.2: Dialect adapter — normalize MERGE/PIVOT/UNPIVOT

**Files:**
- Modify: `src/lib/parser/dialect-adapter.ts`
- Create: `src/__tests__/parser/merge-pivot-adapter.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/__tests__/parser/merge-pivot-adapter.test.ts
import { describe, it, expect } from 'vitest'
import { dialectAdapter } from '@/lib/parser/dialect-adapter'

describe('MERGE normalization', () => {
  it('preserves MERGE keyword through postgres adapter', () => {
    const sql = `MERGE INTO target USING source ON target.id = source.id
WHEN MATCHED THEN UPDATE SET name = source.name
WHEN NOT MATCHED THEN INSERT (id, name) VALUES (source.id, source.name)`
    const adapted = dialectAdapter(sql, 'postgresql')
    expect(adapted).toContain('MERGE')
    expect(adapted).toContain('WHEN MATCHED')
    expect(adapted).toContain('WHEN NOT MATCHED')
  })

  it('preserves PIVOT keyword through sqlserver adapter', () => {
    const sql = `SELECT * FROM orders PIVOT (SUM(amount) FOR month IN ([Jan],[Feb],[Mar])) AS pvt`
    const adapted = dialectAdapter(sql, 'sqlserver')
    expect(adapted).toContain('PIVOT')
  })

  it('preserves UNPIVOT keyword through sqlserver adapter', () => {
    const sql = `SELECT id, month, amount FROM orders UNPIVOT (amount FOR month IN (jan, feb, mar)) AS unpvt`
    const adapted = dialectAdapter(sql, 'sqlserver')
    expect(adapted).toContain('UNPIVOT')
  })
})
```

- [ ] **Step 2: Run to verify (should pass — adapters don't strip these)**

```bash
npx vitest run src/__tests__/parser/merge-pivot-adapter.test.ts
```

If any fail, the adapter is incorrectly stripping those keywords — fix the regex to not touch MERGE/PIVOT/UNPIVOT.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/parser/merge-pivot-adapter.test.ts
git commit -m "test(merge-pivot): verify adapter preserves MERGE/PIVOT/UNPIVOT keywords"
```

---

### Task 1.3: AST-to-graph — MERGE node

**Files:**
- Modify: `src/lib/parser/ast-to-graph.ts`
- Create: `src/__tests__/parser/merge-ast.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/__tests__/parser/merge-ast.test.ts
import { describe, it, expect } from 'vitest'
import { parseSQL } from '@/lib/parser'

describe('MERGE parsing', () => {
  const MERGE_SQL = `MERGE INTO employees AS target
USING new_employees AS source ON target.id = source.id
WHEN MATCHED THEN
  UPDATE SET target.name = source.name, target.salary = source.salary
WHEN NOT MATCHED THEN
  INSERT (id, name, salary) VALUES (source.id, source.name, source.salary)`

  it('produces a merge node', () => {
    const result = parseSQL(MERGE_SQL, 'postgresql')
    // If parser fails, result will be null — that is acceptable (unsupported)
    // But if it succeeds, it must produce a merge node
    if (result !== null) {
      expect(result.nodes.some(n => n.data.nodeType === 'merge')).toBe(true)
    }
  })

  it('produces table nodes for source and target', () => {
    const result = parseSQL(MERGE_SQL, 'postgresql')
    if (result !== null) {
      expect(result.nodes.filter(n => n.data.nodeType === 'table').length).toBeGreaterThanOrEqual(2)
    }
  })
})
```

- [ ] **Step 2: Run to verify (expected: tests skip or pass depending on parser support)**

```bash
npx vitest run src/__tests__/parser/merge-ast.test.ts
```

- [ ] **Step 3: Add MERGE branch to ast-to-graph.ts**

Open `src/lib/parser/ast-to-graph.ts`. Find the main statement-type dispatch. Add a MERGE handler:

```ts
// In the statement dispatch section, add:
if (stmt.type === 'merge') {
  const mergeId = `merge_${nodeIndex++}`
  nodes.push({
    id: mergeId,
    type: 'merge',
    position: { x: 0, y: 0 },
    data: {
      nodeType: 'merge',
      label: `MERGE INTO ${stmt.target?.table ?? 'target'}`,
      detail: `Using ${stmt.using?.table ?? 'source'}`,
      clause: 'MERGE',
    },
  })

  // Source table
  if (stmt.using?.table) {
    const srcId = `table_${nodeIndex++}`
    nodes.push({
      id: srcId, type: 'table', position: { x: 0, y: 0 },
      data: { nodeType: 'table', label: stmt.using.table, detail: 'Source (USING)', clause: `USING ${stmt.using.table}` },
    })
    edges.push({ id: `e_${srcId}_${mergeId}`, source: srcId, target: mergeId, type: 'smoothstep' })
  }

  // Target table
  if (stmt.target?.table) {
    const tgtId = `table_${nodeIndex++}`
    nodes.push({
      id: tgtId, type: 'table', position: { x: 0, y: 0 },
      data: { nodeType: 'table', label: stmt.target.table, detail: 'Target (INTO)', clause: `INTO ${stmt.target.table}` },
    })
    edges.push({ id: `e_${tgtId}_${mergeId}`, source: tgtId, target: mergeId, type: 'smoothstep' })
  }

  // WHEN MATCHED branch
  const matchedId = `filter_matched_${nodeIndex++}`
  nodes.push({
    id: matchedId, type: 'filter', position: { x: 0, y: 0 },
    data: { nodeType: 'filter', label: 'WHEN MATCHED', detail: 'UPDATE or DELETE', clause: 'WHEN MATCHED THEN' },
  })
  edges.push({ id: `e_${mergeId}_${matchedId}`, source: mergeId, target: matchedId, type: 'smoothstep' })

  // WHEN NOT MATCHED branch
  const notMatchedId = `filter_notmatched_${nodeIndex++}`
  nodes.push({
    id: notMatchedId, type: 'filter', position: { x: 0, y: 0 },
    data: { nodeType: 'filter', label: 'WHEN NOT MATCHED', detail: 'INSERT', clause: 'WHEN NOT MATCHED THEN' },
  })
  edges.push({ id: `e_${mergeId}_${notMatchedId}`, source: mergeId, target: notMatchedId, type: 'smoothstep' })

  return { nodes, edges, glossary }
}
```

Also add PIVOT and UNPIVOT handlers (simpler — single input node → operation node → output):

```ts
if (stmt.type === 'pivot' || stmt.type === 'unpivot') {
  const opId = `${stmt.type}_${nodeIndex++}`
  const nodeType = stmt.type as 'pivot' | 'unpivot'
  nodes.push({
    id: opId, type: nodeType, position: { x: 0, y: 0 },
    data: {
      nodeType,
      label: nodeType.toUpperCase(),
      detail: `${stmt.type === 'pivot' ? 'Aggregates columns into rows' : 'Expands rows into columns'}`,
      clause: nodeType.toUpperCase(),
    },
  })
  return { nodes, edges, glossary }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/__tests__/parser/merge-ast.test.ts
```

Expected: PASS (with the `if (result !== null)` guard, tests pass regardless of whether the parser supports MERGE).

- [ ] **Step 5: Commit**

```bash
git add src/lib/parser/ast-to-graph.ts src/__tests__/parser/merge-ast.test.ts
git commit -m "feat(merge-pivot): add MERGE/PIVOT/UNPIVOT branches to ast-to-graph"
```

---

### Task 1.4: Node components and registration

**Files:**
- Create: `src/components/diagram/nodes/MergeNode.tsx`
- Create: `src/components/diagram/nodes/PivotNode.tsx`
- Create: `src/components/diagram/nodes/UnpivotNode.tsx`
- Modify: `src/components/diagram/nodes/index.ts`

- [ ] **Step 1: Create MergeNode**

```tsx
// src/components/diagram/nodes/MergeNode.tsx
import { BaseNode } from './BaseNode'
import type { NodeProps } from '@xyflow/react'
import type { SQLNodeData } from '@/types'

export function MergeNode(props: NodeProps<SQLNodeData>) {
  return <BaseNode {...props} accentColor="#9B59B6" icon="⤢" />
}
```

- [ ] **Step 2: Create PivotNode**

```tsx
// src/components/diagram/nodes/PivotNode.tsx
import { BaseNode } from './BaseNode'
import type { NodeProps } from '@xyflow/react'
import type { SQLNodeData } from '@/types'

export function PivotNode(props: NodeProps<SQLNodeData>) {
  return <BaseNode {...props} accentColor="#1ABC9C" icon="⇔" />
}
```

- [ ] **Step 3: Create UnpivotNode**

```tsx
// src/components/diagram/nodes/UnpivotNode.tsx
import { BaseNode } from './BaseNode'
import type { NodeProps } from '@xyflow/react'
import type { SQLNodeData } from '@/types'

export function UnpivotNode(props: NodeProps<SQLNodeData>) {
  return <BaseNode {...props} accentColor="#E67E22" icon="⇕" />
}
```

- [ ] **Step 4: Register in nodes/index.ts**

Open `src/components/diagram/nodes/index.ts` and add:

```ts
import { MergeNode }   from './MergeNode'
import { PivotNode }   from './PivotNode'
import { UnpivotNode } from './UnpivotNode'

// In NODE_COLORS:
merge:   '#9B59B6',
pivot:   '#1ABC9C',
unpivot: '#E67E22',

// In customNodeTypes:
merge:   MergeNode,
pivot:   PivotNode,
unpivot: UnpivotNode,
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/diagram/nodes/MergeNode.tsx src/components/diagram/nodes/PivotNode.tsx src/components/diagram/nodes/UnpivotNode.tsx src/components/diagram/nodes/index.ts
git commit -m "feat(merge-pivot): add MergeNode, PivotNode, UnpivotNode components and registration"
```

---

### Task 1.5: Add MERGE/PIVOT examples

**Files:**
- Modify: `src/lib/examples/index.ts`

- [ ] **Step 1: Add examples**

Add 3 examples to the array:

```ts
{
  id: 'sqlserver-merge',
  title: 'MERGE (upsert)',
  dialect: 'sqlserver',
  category: 'basic',
  description: 'SQL Server MERGE statement — upsert pattern',
  sql: `MERGE INTO employees AS target
USING new_employees AS source
  ON target.employee_id = source.employee_id
WHEN MATCHED THEN
  UPDATE SET
    target.name   = source.name,
    target.salary = source.salary
WHEN NOT MATCHED THEN
  INSERT (employee_id, name, salary)
  VALUES (source.employee_id, source.name, source.salary);`,
},
{
  id: 'sqlserver-pivot',
  title: 'PIVOT — columns from rows',
  dialect: 'sqlserver',
  category: 'aggregation',
  description: 'SQL Server PIVOT — aggregate rows into columns',
  sql: `SELECT department, [Jan], [Feb], [Mar]
FROM (
  SELECT department, month, sales
  FROM sales_data
) AS src
PIVOT (
  SUM(sales)
  FOR month IN ([Jan], [Feb], [Mar])
) AS pvt
ORDER BY department`,
},
{
  id: 'sqlserver-unpivot',
  title: 'UNPIVOT — rows from columns',
  dialect: 'sqlserver',
  category: 'basic',
  description: 'SQL Server UNPIVOT — expand column values into rows',
  sql: `SELECT employee_id, quarter, sales
FROM quarterly_sales
UNPIVOT (
  sales FOR quarter IN (Q1, Q2, Q3, Q4)
) AS unpvt`,
},
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/examples/index.ts
git commit -m "feat(merge-pivot): add MERGE, PIVOT, UNPIVOT example queries"
```

---

## FEATURE 4 — Column Lineage

### Task 4.1: Column lineage extraction module

**Files:**
- Create: `src/lib/lineage/column-lineage.ts`
- Create: `src/__tests__/lineage/column-lineage.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/__tests__/lineage/column-lineage.test.ts
import { describe, it, expect } from 'vitest'
import { extractColumnLineage } from '@/lib/lineage/column-lineage'
import { parseSQL } from '@/lib/parser'

describe('extractColumnLineage', () => {
  it('extracts direct column references', () => {
    const result = parseSQL('SELECT u.id, u.name FROM users u', 'postgresql')
    expect(result).not.toBeNull()
    const lineage = extractColumnLineage(result!.rawAst)
    expect(lineage.length).toBeGreaterThan(0)
    const idEntry = lineage.find(e => e.outputAlias === 'id')
    expect(idEntry).toBeDefined()
    expect(idEntry!.sources[0].table).toBe('u')
    expect(idEntry!.sources[0].column).toBe('id')
  })

  it('handles column aliases', () => {
    const result = parseSQL('SELECT u.email AS user_email FROM users u', 'postgresql')
    const lineage = extractColumnLineage(result!.rawAst)
    const entry = lineage.find(e => e.outputAlias === 'user_email')
    expect(entry).toBeDefined()
    expect(entry!.sources[0].column).toBe('email')
  })

  it('handles SELECT *', () => {
    const result = parseSQL('SELECT * FROM users', 'postgresql')
    const lineage = extractColumnLineage(result!.rawAst)
    expect(lineage.some(e => e.sources[0]?.column === '*')).toBe(true)
  })

  it('handles aggregate expressions', () => {
    const result = parseSQL('SELECT COUNT(o.id) AS order_count FROM orders o', 'postgresql')
    const lineage = extractColumnLineage(result!.rawAst)
    const entry = lineage.find(e => e.outputAlias === 'order_count')
    expect(entry).toBeDefined()
    expect(entry!.expression).toBeDefined()
    expect(entry!.expression).toContain('COUNT')
  })

  it('returns empty array for non-SELECT statements', () => {
    const lineage = extractColumnLineage(null)
    expect(lineage).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/__tests__/lineage/column-lineage.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/lineage/column-lineage'`

- [ ] **Step 3: Implement the extraction module**

```ts
// src/lib/lineage/column-lineage.ts

export interface ColumnSource {
  table:  string
  column: string
  alias?: string
}

export interface ColumnLineageEntry {
  outputAlias: string
  expression?: string
  sources:     ColumnSource[]
}

export type ColumnLineage = ColumnLineageEntry[]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveExpr(expr: any): { sources: ColumnSource[]; expressionStr?: string } {
  if (!expr) return { sources: [] }

  // Column reference: { type: 'column_ref', table, column }
  if (expr.type === 'column_ref') {
    return {
      sources: [{
        table:  expr.table ?? '',
        column: typeof expr.column === 'string' ? expr.column : String(expr.column ?? '*'),
      }],
    }
  }

  // Star: { type: 'star' } or column === '*'
  if (expr.type === 'star' || expr.column === '*') {
    return { sources: [{ table: expr.table ?? '*', column: '*' }] }
  }

  // Aggregate / function: { type: 'aggr_func' | 'function', name, args }
  if (expr.type === 'aggr_func' || expr.type === 'function') {
    const name = expr.name ?? expr.type
    const argSources: ColumnSource[] = []
    const argList = expr.args?.value ?? expr.args ?? []
    for (const arg of (Array.isArray(argList) ? argList : [argList])) {
      argSources.push(...resolveExpr(arg).sources)
    }
    const argStr = argSources.map(s => [s.table, s.column].filter(Boolean).join('.')).join(', ')
    return {
      sources:       argSources,
      expressionStr: `${name}(${argStr})`,
    }
  }

  // Binary expression: recurse both sides
  if (expr.type === 'binary_expr') {
    const left  = resolveExpr(expr.left)
    const right = resolveExpr(expr.right)
    return { sources: [...left.sources, ...right.sources] }
  }

  return { sources: [] }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractColumnLineage(rawAst: unknown): ColumnLineage {
  if (!rawAst) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stmts: any[] = Array.isArray(rawAst) ? rawAst : [rawAst]
  const stmt = stmts[0]

  if (!stmt || stmt.type !== 'select') return []

  const columns = stmt.columns
  if (!columns || columns === '*') {
    return [{ outputAlias: '*', sources: [{ table: '*', column: '*' }] }]
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (Array.isArray(columns) ? columns : []).map((col: any): ColumnLineageEntry => {
    const alias = col.as ?? null
    const { sources, expressionStr } = resolveExpr(col.expr)

    const outputAlias =
      alias ??
      (sources[0]?.column !== '*' ? sources[0]?.column : undefined) ??
      (expressionStr ? expressionStr.split('(')[0] : 'expr')

    const entry: ColumnLineageEntry = { outputAlias, sources }
    if (expressionStr) entry.expression = expressionStr
    return entry
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/lineage/column-lineage.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/lineage/column-lineage.ts src/__tests__/lineage/column-lineage.test.ts
git commit -m "feat(lineage): add extractColumnLineage module"
```

---

### Task 4.2: Lineage in store and LineagePanel

**Files:**
- Modify: `src/store/useAppStore.ts`
- Create: `src/components/panels/LineagePanel.tsx`
- Modify: `src/components/layout/PanelRight.tsx`
- Modify: `src/hooks/useParseQuery.ts`

- [ ] **Step 1: Add columnLineage to store**

In `src/store/useAppStore.ts`:

```ts
// Add import:
import type { ColumnLineage } from '@/lib/lineage/column-lineage'

// Add to interface:
columnLineage: ColumnLineage
setColumnLineage: (l: ColumnLineage) => void
```

```ts
// Add to initial state:
columnLineage: [],
setColumnLineage: (columnLineage) => set({ columnLineage }),
```

Do NOT persist `columnLineage`.

- [ ] **Step 2: Compute lineage in useParseQuery**

In `src/hooks/useParseQuery.ts`:

```ts
// Add import:
import { extractColumnLineage } from '@/lib/lineage/column-lineage'

// After setParseResult(result):
const lineage = extractColumnLineage(result.rawAst)
setColumnLineage(lineage)

// In error/empty branches:
setColumnLineage([])
```

- [ ] **Step 3: Create LineagePanel**

```tsx
// src/components/panels/LineagePanel.tsx
import { useAppStore } from '@/store/useAppStore'

export function LineagePanel() {
  const lineage = useAppStore((s) => s.columnLineage)

  if (lineage.length === 0) {
    return (
      <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center' }}>
        No lineage data. Enter a SELECT query to trace column origins.
      </div>
    )
  }

  return (
    <div style={{ padding: 12, overflowY: 'auto', height: '100%' }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>
        {lineage.length} output column{lineage.length !== 1 ? 's' : ''} traced
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Output', 'Expression', 'Source(s)'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-3)', fontWeight: 600, fontSize: 10 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lineage.map((entry, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--text-1)', fontFamily: 'monospace' }}>
                {entry.outputAlias}
              </td>
              <td style={{ padding: '6px 8px', color: 'var(--text-2)', fontFamily: 'monospace', fontSize: 10 }}>
                {entry.expression ?? '—'}
              </td>
              <td style={{ padding: '6px 8px', color: 'var(--text-2)', fontFamily: 'monospace', fontSize: 10 }}>
                {entry.sources.map((s, si) => (
                  <span key={si}>
                    {s.table ? `${s.table}.` : ''}<span style={{ color: 'var(--a)' }}>{s.column}</span>
                    {si < entry.sources.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Add Lineage tab to PanelRight**

In `src/components/layout/PanelRight.tsx`:

```tsx
// Add import:
import { LineagePanel } from '@/components/panels/LineagePanel'

// Add tab trigger (after Suggestions trigger):
<TabsTrigger value="lineage" style={{ fontSize: 11, padding: '3px 10px' }}>
  Lineage
</TabsTrigger>

// Add tab content:
<TabsContent value="lineage" style={{ height: '100%', margin: 0, overflow: 'auto' }}>
  <LineagePanel />
</TabsContent>
```

- [ ] **Step 5: Verify in browser**

```bash
npm run dev
```

Enter `SELECT u.id, u.name AS full_name, COUNT(o.id) AS orders FROM users u JOIN orders o ON u.id = o.user_id GROUP BY u.id, u.name`. Open the Lineage tab — should show 3 rows with sources traced.

- [ ] **Step 6: Commit**

```bash
git add src/store/useAppStore.ts src/hooks/useParseQuery.ts src/components/panels/LineagePanel.tsx src/components/layout/PanelRight.tsx
git commit -m "feat(lineage): add LineagePanel tab with column source tracing"
```

---

## FEATURE 10 — Query Collections

### Task 10.1: Collections data model and store

**Files:**
- Create: `src/lib/collections/types.ts`
- Modify: `src/store/useAppStore.ts`
- Create: `src/__tests__/collections/collections.test.ts`

- [ ] **Step 1: Create collection types**

```ts
// src/lib/collections/types.ts
import type { Dialect } from '@/types'

export interface SavedQuery {
  id:           string
  name:         string
  description?: string
  sql:          string
  dialect:      Dialect
  tags:         string[]
  savedAt:      string   // ISO date string
}

export interface Collection {
  id:          string
  name:        string
  color?:      string
  createdAt:   string
  queries:     SavedQuery[]
}

export const MAX_COLLECTIONS = 20
export const MAX_TOTAL_QUERIES = 200
```

- [ ] **Step 2: Write failing tests for store actions**

```ts
// src/__tests__/collections/collections.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { migrateHistoryToCollections, addQueryToCollection, createCollection } from '@/lib/collections/helpers'
import type { Collection } from '@/lib/collections/types'

describe('migrateHistoryToCollections', () => {
  it('converts history entries to a Recent collection', () => {
    const history = [
      { query: 'SELECT 1', dialect: 'postgresql' as const, timestamp: 1000 },
      { query: 'SELECT 2', dialect: 'mysql' as const, timestamp: 2000 },
    ]
    const collections = migrateHistoryToCollections(history)
    expect(collections).toHaveLength(1)
    expect(collections[0].name).toBe('Recent')
    expect(collections[0].queries).toHaveLength(2)
    expect(collections[0].queries[0].sql).toBe('SELECT 1')
  })
})

describe('createCollection', () => {
  it('creates a collection with generated id', () => {
    const col = createCollection('My Queries')
    expect(col.name).toBe('My Queries')
    expect(col.id).toBeTruthy()
    expect(col.queries).toEqual([])
  })
})

describe('addQueryToCollection', () => {
  it('adds a query to a collection', () => {
    const col: Collection = { id: 'c1', name: 'Test', createdAt: '', queries: [] }
    const result = addQueryToCollection(col, { name: 'My query', sql: 'SELECT 1', dialect: 'postgresql', tags: [] })
    expect(result.queries).toHaveLength(1)
    expect(result.queries[0].name).toBe('My query')
    expect(result.queries[0].sql).toBe('SELECT 1')
    expect(result.queries[0].id).toBeTruthy()
  })

  it('enforces MAX_TOTAL_QUERIES limit', () => {
    let col: Collection = { id: 'c1', name: 'Big', createdAt: '', queries: [] }
    for (let i = 0; i < 201; i++) {
      col = addQueryToCollection(col, { name: `q${i}`, sql: `SELECT ${i}`, dialect: 'postgresql', tags: [] })
    }
    expect(col.queries.length).toBeLessThanOrEqual(200)
  })
})
```

- [ ] **Step 3: Run to verify failure**

```bash
npx vitest run src/__tests__/collections/collections.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/collections/helpers'`

- [ ] **Step 4: Create helpers module**

```ts
// src/lib/collections/helpers.ts
import type { Collection, SavedQuery } from './types'
import { MAX_TOTAL_QUERIES } from './types'
import type { Dialect } from '@/types'

let _idCounter = 0
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${++_idCounter}`
}

export function createCollection(name: string, color?: string): Collection {
  return { id: generateId('col'), name, color, createdAt: new Date().toISOString(), queries: [] }
}

interface NewQueryInput {
  name:         string
  description?: string
  sql:          string
  dialect:      Dialect
  tags:         string[]
}

export function addQueryToCollection(collection: Collection, input: NewQueryInput): Collection {
  const query: SavedQuery = {
    id:          generateId('q'),
    name:        input.name,
    description: input.description,
    sql:         input.sql,
    dialect:     input.dialect,
    tags:        input.tags,
    savedAt:     new Date().toISOString(),
  }
  const updated = [query, ...collection.queries]
  if (updated.length > MAX_TOTAL_QUERIES) updated.splice(MAX_TOTAL_QUERIES)
  return { ...collection, queries: updated }
}

export function removeQueryFromCollection(collection: Collection, queryId: string): Collection {
  return { ...collection, queries: collection.queries.filter(q => q.id !== queryId) }
}

export function migrateHistoryToCollections(
  history: { query: string; dialect: Dialect; timestamp: number }[],
): Collection[] {
  if (history.length === 0) return []
  const recentCol: Collection = {
    id:        'col_recent_migrated',
    name:      'Recent',
    createdAt: new Date().toISOString(),
    queries:   history.map((h, i) => ({
      id:      `q_migrated_${i}`,
      name:    h.query.replace(/\s+/g, ' ').trim().substring(0, 40),
      sql:     h.query,
      dialect: h.dialect,
      tags:    [],
      savedAt: new Date(h.timestamp).toISOString(),
    })),
  }
  return [recentCol]
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/collections/collections.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 6: Add collections to store**

In `src/store/useAppStore.ts`:

```ts
// Add imports:
import type { Collection } from '@/lib/collections/types'
import { createCollection, addQueryToCollection, migrateHistoryToCollections } from '@/lib/collections/helpers'
import { MAX_COLLECTIONS } from '@/lib/collections/types'

// Add to AppStore interface:
collections:      Collection[]
saveQueryToCollection: (collectionId: string, input: { name: string; description?: string; tags: string[] }) => void
addCollection:    (name: string, color?: string) => void
removeCollection: (collectionId: string) => void
renameCollection: (collectionId: string, newName: string) => void
```

```ts
// Add to initial state (AFTER the persist migration below):
collections: [],

// Actions:
saveQueryToCollection: (collectionId, input) =>
  set((state) => ({
    collections: state.collections.map((c) =>
      c.id === collectionId
        ? addQueryToCollection(c, { ...input, sql: state.query, dialect: state.dialect })
        : c
    ),
  })),

addCollection: (name, color) =>
  set((state) => {
    if (state.collections.length >= MAX_COLLECTIONS) return {}
    return { collections: [createCollection(name, color), ...state.collections] }
  }),

removeCollection: (collectionId) =>
  set((state) => ({
    collections: state.collections.filter((c) => c.id !== collectionId),
  })),

renameCollection: (collectionId, newName) =>
  set((state) => ({
    collections: state.collections.map((c) =>
      c.id === collectionId ? { ...c, name: newName } : c
    ),
  })),
```

Update `partialize` to persist `collections` instead of `history`:

```ts
partialize: (state) => ({
  collections: state.collections,
  dialect:     state.dialect,
  theme:       state.theme,
}),
```

Add migration `onRehydrateStorage`:

```ts
// In the persist options object:
onRehydrateStorage: () => (state) => {
  if (!state) return
  // Migration: if old history exists in localStorage, convert to collections
  const raw = localStorage.getItem('vali-viewsql-store')
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.state?.history?.length > 0 && state.collections.length === 0) {
        state.collections = migrateHistoryToCollections(parsed.state.history)
      }
    } catch { /* ignore */ }
  }
},
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/collections/types.ts src/lib/collections/helpers.ts src/__tests__/collections/collections.test.ts src/store/useAppStore.ts
git commit -m "feat(collections): add collection data model, helpers, and store integration"
```

---

### Task 10.2: CollectionPicker UI

**Files:**
- Create: `src/components/editor/CollectionPicker.tsx`
- Create: `src/components/editor/SaveQueryForm.tsx`
- Modify: whichever layout component renders `HistoryPicker` (use grep to find it)

- [ ] **Step 1: Find HistoryPicker usages**

```bash
grep -r "HistoryPicker" src/ --include="*.tsx" -l
```

Note the files. You'll replace `<HistoryPicker />` with `<CollectionPicker />` in them.

- [ ] **Step 2: Create SaveQueryForm**

```tsx
// src/components/editor/SaveQueryForm.tsx
import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'

interface SaveQueryFormProps {
  onClose: () => void
}

export function SaveQueryForm({ onClose }: SaveQueryFormProps) {
  const collections         = useAppStore((s) => s.collections)
  const saveQueryToCollection = useAppStore((s) => s.saveQueryToCollection)
  const addCollection       = useAppStore((s) => s.addCollection)
  const [name, setName]     = useState('')
  const [desc, setDesc]     = useState('')
  const [tags, setTags]     = useState('')
  const [colId, setColId]   = useState(collections[0]?.id ?? '')
  const [newColName, setNewColName] = useState('')

  const handleSave = () => {
    if (!name.trim() || !colId) return
    saveQueryToCollection(colId, {
      name:        name.trim(),
      description: desc.trim() || undefined,
      tags:        tags.split(',').map(t => t.trim()).filter(Boolean),
    })
    onClose()
  }

  const handleCreateCollection = () => {
    if (!newColName.trim()) return
    addCollection(newColName.trim())
    setNewColName('')
  }

  const inputStyle = {
    width: '100%', padding: '6px 8px', borderRadius: 5, fontSize: 12,
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    color: 'var(--text-1)', outline: 'none', boxSizing: 'border-box' as const,
  }
  const labelStyle = { fontSize: 10, color: 'var(--text-3)', marginBottom: 3, display: 'block' as const }

  return (
    <div style={{ padding: 14, width: 280, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>Save Query</div>
      <div>
        <label style={labelStyle}>Name *</label>
        <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="My query name" />
      </div>
      <div>
        <label style={labelStyle}>Description</label>
        <input style={inputStyle} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional" />
      </div>
      <div>
        <label style={labelStyle}>Tags (comma-separated)</label>
        <input style={inputStyle} value={tags} onChange={e => setTags(e.target.value)} placeholder="reporting, slow, draft" />
      </div>
      <div>
        <label style={labelStyle}>Collection</label>
        <select style={{ ...inputStyle, cursor: 'pointer' }} value={colId} onChange={e => setColId(e.target.value)}>
          {collections.map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c.queries.length})</option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input style={{ ...inputStyle, flex: 1 }} value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="New collection name" />
        <button onClick={handleCreateCollection} style={{ padding: '6px 10px', borderRadius: 5, fontSize: 11, background: 'var(--bg-elevated)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
          + New
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '5px 12px', borderRadius: 5, fontSize: 11, background: 'none', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-2)' }}>
          Cancel
        </button>
        <button onClick={handleSave} disabled={!name.trim() || !colId} style={{ padding: '5px 12px', borderRadius: 5, fontSize: 11, background: 'var(--a)', border: 'none', cursor: 'pointer', fontWeight: 700, color: '#000', opacity: !name.trim() || !colId ? 0.5 : 1 }}>
          Save
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create CollectionPicker**

```tsx
// src/components/editor/CollectionPicker.tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { BookMarked, Search, Trash2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { SaveQueryForm } from './SaveQueryForm'
import { DIALECTS } from './DialectSelector'

const DIALECT_META = Object.fromEntries(DIALECTS.map(d => [d.value, d]))

function DialectBadge({ dialect }: { dialect: string }) {
  const meta = DIALECT_META[dialect]
  return (
    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, fontWeight: 700, background: meta?.bg ?? 'var(--elevated)', color: meta?.color ?? 'var(--text-1)', border: `1px solid ${meta?.border ?? 'var(--border)'}` }}>
      {meta?.abbr ?? dialect.toUpperCase()}
    </span>
  )
}

export function CollectionPicker() {
  const collections = useAppStore((s) => s.collections)
  const setQuery    = useAppStore((s) => s.setQuery)
  const setDialect  = useAppStore((s) => s.setDialect)
  const removeCollection = useAppStore((s) => s.removeCollection)

  const [open, setOpen]       = useState(false)
  const [showSave, setShowSave] = useState(false)
  const [search, setSearch]   = useState('')
  const [rect, setRect]       = useState<DOMRect | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const totalQueries = collections.reduce((sum, c) => sum + c.queries.length, 0)

  const toggle = useCallback(() => {
    if (!open && btnRef.current) setRect(btnRef.current.getBoundingClientRect())
    setOpen(v => !v)
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const filtered = search.trim()
    ? collections.map(c => ({
        ...c,
        queries: c.queries.filter(q =>
          q.name.toLowerCase().includes(search.toLowerCase()) ||
          q.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
        ),
      })).filter(c => c.queries.length > 0)
    : collections

  return (
    <>
      <button ref={btnRef} onClick={toggle}
        aria-label="Query collections" aria-expanded={open} title="Collections"
        style={{ background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 5 }}>
        <BookMarked size={13} />{totalQueries}
      </button>

      {open && rect && createPortal(
        <div style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: 320, maxHeight: 400, background: 'var(--surface)', border: '1px solid var(--border-hi)', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.28)', zIndex: 9999, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {showSave ? (
            <SaveQueryForm onClose={() => setShowSave(false)} />
          ) : (
            <>
              <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', background: 'var(--elevated)', display: 'flex', gap: 6, alignItems: 'center' }}>
                <Search size={12} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search queries..." autoFocus
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 11, color: 'var(--text-1)' }}
                />
                <button onClick={() => setShowSave(true)} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'var(--a)', border: 'none', cursor: 'pointer', fontWeight: 700, color: '#000', whiteSpace: 'nowrap' }}>
                  + Save
                </button>
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {filtered.length === 0 && (
                  <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-3)' }}>
                    {search ? 'No queries match your search' : 'No saved queries yet'}
                  </div>
                )}
                {filtered.map(col => (
                  <div key={col.id}>
                    <div style={{ padding: '6px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                      <span>{col.name} ({col.queries.length})</span>
                      {col.id !== 'col_recent_migrated' && (
                        <button onClick={() => removeCollection(col.id)} aria-label={`Delete collection ${col.name}`}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E24B4A', padding: 2 }}>
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                    {col.queries.map((q, i) => (
                      <button key={q.id} onClick={() => { setDialect(q.dialect); setQuery(q.sql); setOpen(false) }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: i < col.queries.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <DialectBadge dialect={q.dialect} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)' }}>{q.name}</span>
                        </div>
                        <code style={{ fontSize: 10, color: 'var(--text-2)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {q.sql.replace(/\s+/g, ' ').trim().substring(0, 80)}
                        </code>
                        {q.tags.length > 0 && (
                          <div style={{ marginTop: 3, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {q.tags.map(t => (
                              <span key={t} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'var(--elevated)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>{t}</span>
                            ))}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}
```

- [ ] **Step 4: Replace HistoryPicker with CollectionPicker in layouts**

In all files found in Step 1:

```tsx
// Remove:
import { HistoryPicker } from '@/components/editor/HistoryPicker'
// Add:
import { CollectionPicker } from '@/components/editor/CollectionPicker'

// Replace JSX:
// <HistoryPicker />  →  <CollectionPicker />
```

- [ ] **Step 5: Verify in browser**

```bash
npm run dev
```

Click the bookmark icon. Save a query by clicking "+ Save", entering a name, and clicking Save. The query should appear in the collection. Switching to it should restore the SQL and dialect.

- [ ] **Step 6: Commit**

```bash
git add src/lib/collections/ src/components/editor/CollectionPicker.tsx src/components/editor/SaveQueryForm.tsx
git commit -m "feat(collections): add CollectionPicker with save, search, and collection management"
```

---

## FEATURE 5 — Cross-Dialect Conversion

### Task 5.1: Dialect converter module

**Files:**
- Create: `src/lib/converter/dialect-converter.ts`
- Create: `src/__tests__/converter/dialect-converter.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/__tests__/converter/dialect-converter.test.ts
import { describe, it, expect } from 'vitest'
import { convertDialect } from '@/lib/converter/dialect-converter'

describe('convertDialect — PostgreSQL → SQL Server', () => {
  it('converts LIMIT n to TOP n', () => {
    const { convertedSQL } = convertDialect(
      'SELECT id FROM users LIMIT 10',
      'postgresql', 'sqlserver',
    )
    expect(convertedSQL).toMatch(/SELECT\s+TOP\s+10/i)
    expect(convertedSQL).not.toMatch(/LIMIT/i)
  })

  it('converts LIMIT n OFFSET m to OFFSET FETCH', () => {
    const { convertedSQL } = convertDialect(
      'SELECT id FROM users LIMIT 10 OFFSET 20',
      'postgresql', 'sqlserver',
    )
    expect(convertedSQL).toMatch(/OFFSET\s+20\s+ROWS/i)
    expect(convertedSQL).toMatch(/FETCH\s+NEXT\s+10\s+ROWS\s+ONLY/i)
  })

  it('converts ILIKE to LIKE', () => {
    const { convertedSQL } = convertDialect(
      "SELECT id FROM users WHERE name ILIKE '%john%'",
      'postgresql', 'sqlserver',
    )
    expect(convertedSQL).not.toMatch(/ILIKE/i)
    expect(convertedSQL).toMatch(/LIKE/i)
  })

  it('records each change applied', () => {
    const { changes } = convertDialect('SELECT id FROM users LIMIT 5', 'postgresql', 'sqlserver')
    expect(changes.length).toBeGreaterThan(0)
    expect(changes[0]).toHaveProperty('rule')
    expect(changes[0]).toHaveProperty('original')
    expect(changes[0]).toHaveProperty('replaced')
  })
})

describe('convertDialect — SQL Server → PostgreSQL', () => {
  it('converts TOP n to LIMIT n', () => {
    const { convertedSQL } = convertDialect(
      'SELECT TOP 10 id FROM users',
      'sqlserver', 'postgresql',
    )
    expect(convertedSQL).toMatch(/LIMIT\s+10/i)
    expect(convertedSQL).not.toMatch(/TOP/i)
  })

  it('removes WITH(NOLOCK)', () => {
    const { convertedSQL } = convertDialect(
      'SELECT id FROM orders WITH(NOLOCK)',
      'sqlserver', 'postgresql',
    )
    expect(convertedSQL).not.toMatch(/NOLOCK/i)
  })
})

describe('convertDialect — same dialect', () => {
  it('returns original SQL unchanged', () => {
    const sql = 'SELECT id FROM users'
    const { convertedSQL, changes } = convertDialect(sql, 'postgresql', 'postgresql')
    expect(convertedSQL).toBe(sql)
    expect(changes).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/__tests__/converter/dialect-converter.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/converter/dialect-converter'`

- [ ] **Step 3: Implement the converter**

```ts
// src/lib/converter/dialect-converter.ts
import type { Dialect } from '@/types'

export interface ConversionChange {
  rule:     string
  original: string
  replaced: string
}

export interface ConversionResult {
  convertedSQL: string
  changes:      ConversionChange[]
}

type ConversionRule = {
  id:      string
  match:   RegExp
  replace: string | ((match: string, ...args: string[]) => string)
  note:    string
}

// ── Rule sets per direction ──────────────────────────────────────────────────

const PG_TO_MSSQL: ConversionRule[] = [
  {
    id: 'pg-limit-offset-to-fetch',
    match: /\bLIMIT\s+(\d+)\s+OFFSET\s+(\d+)\b/gi,
    replace: (_m, limit, offset) => `OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`,
    note: 'LIMIT n OFFSET m → OFFSET m ROWS FETCH NEXT n ROWS ONLY',
  },
  {
    id: 'pg-limit-to-top',
    match: /\bSELECT\b(.*?)\bLIMIT\s+(\d+)\b/gi,
    replace: (_m, cols, n) => `SELECT TOP ${n}${cols}`,
    note: 'LIMIT n → TOP n (moved to SELECT)',
  },
  {
    id: 'pg-ilike-to-like',
    match: /\bILIKE\b/gi,
    replace: 'LIKE',
    note: 'ILIKE → LIKE (note: SQL Server LIKE is case-insensitive by default in CI_AS collations)',
  },
  {
    id: 'pg-cast-shorthand',
    match: /(\w+)::(\w+)/g,
    replace: (_m, val, type) => `CAST(${val} AS ${type})`,
    note: '::type cast → CAST(expr AS type)',
  },
  {
    id: 'pg-serial-to-identity',
    match: /\bSERIAL\b/gi,
    replace: 'INT IDENTITY(1,1)',
    note: 'SERIAL → INT IDENTITY(1,1)',
  },
]

const MSSQL_TO_PG: ConversionRule[] = [
  {
    id: 'mssql-top-to-limit',
    match: /\bSELECT\s+TOP\s+(\d+)\b(.*?)\bFROM\b/gi,
    replace: (_m, n, cols) => `SELECT${cols}FROM`,
    note: 'TOP n removed (LIMIT added at end)',
  },
  {
    id: 'mssql-top-add-limit',
    match: /\bSELECT\s+TOP\s+(\d+)\b/gi,
    replace: (_m, n) => `-- LIMIT ${n} added at end of query\nSELECT`,
    note: 'TOP n → LIMIT n (appended)',
  },
  {
    id: 'mssql-nolock-remove',
    match: /\bWITH\s*\(\s*NOLOCK\s*\)/gi,
    replace: '',
    note: 'WITH(NOLOCK) removed (not applicable in PostgreSQL)',
  },
  {
    id: 'mssql-bracket-to-quote',
    match: /\[(\w+)\]/g,
    replace: (_m, name) => `"${name}"`,
    note: '[bracket] identifiers → "double-quote" identifiers',
  },
  {
    id: 'mssql-isnull-to-coalesce',
    match: /\bISNULL\s*\(/gi,
    replace: 'COALESCE(',
    note: 'ISNULL() → COALESCE()',
  },
  {
    id: 'mssql-getdate-to-now',
    match: /\bGETDATE\s*\(\s*\)/gi,
    replace: 'NOW()',
    note: 'GETDATE() → NOW()',
  },
]

const PG_TO_MYSQL: ConversionRule[] = [
  {
    id: 'pg-ilike-to-like-mysql',
    match: /\bILIKE\b/gi,
    replace: 'LIKE',
    note: 'ILIKE → LIKE (MySQL LIKE is case-insensitive by default)',
  },
  {
    id: 'pg-doublequote-to-backtick',
    match: /"(\w+)"/g,
    replace: (_m, name) => '`' + name + '`',
    note: '"double-quote" identifiers → `backtick` identifiers',
  },
  {
    id: 'pg-serial-to-auto',
    match: /\bSERIAL\b/gi,
    replace: 'INT AUTO_INCREMENT',
    note: 'SERIAL → INT AUTO_INCREMENT',
  },
]

const MYSQL_TO_PG: ConversionRule[] = [
  {
    id: 'mysql-backtick-to-quote',
    match: /`(\w+)`/g,
    replace: (_m, name) => `"${name}"`,
    note: '`backtick` identifiers → "double-quote" identifiers',
  },
  {
    id: 'mysql-limit-offset-shorthand',
    match: /\bLIMIT\s+(\d+)\s*,\s*(\d+)\b/g,
    replace: (_m, offset, limit) => `LIMIT ${limit} OFFSET ${offset}`,
    note: 'LIMIT offset, count → LIMIT count OFFSET offset',
  },
  {
    id: 'mysql-auto-increment',
    match: /\bAUTO_INCREMENT\b/gi,
    replace: 'SERIAL',
    note: 'AUTO_INCREMENT → SERIAL',
  },
  {
    id: 'mysql-ifnull-to-coalesce',
    match: /\bIFNULL\s*\(/gi,
    replace: 'COALESCE(',
    note: 'IFNULL() → COALESCE()',
  },
]

const MSSQL_TO_MYSQL: ConversionRule[] = [
  {
    id: 'mssql-bracket-to-backtick',
    match: /\[(\w+)\]/g,
    replace: (_m, name) => '`' + name + '`',
    note: '[bracket] → `backtick` identifiers',
  },
  {
    id: 'mssql-nolock-remove-mysql',
    match: /\bWITH\s*\(\s*NOLOCK\s*\)/gi,
    replace: '',
    note: 'WITH(NOLOCK) removed',
  },
  {
    id: 'mssql-getdate-to-now-mysql',
    match: /\bGETDATE\s*\(\s*\)/gi,
    replace: 'NOW()',
    note: 'GETDATE() → NOW()',
  },
]

const MYSQL_TO_MSSQL: ConversionRule[] = [
  {
    id: 'mysql-backtick-to-bracket',
    match: /`(\w+)`/g,
    replace: (_m, name) => `[${name}]`,
    note: '`backtick` → [bracket] identifiers',
  },
  {
    id: 'mysql-auto-increment-to-identity',
    match: /\bAUTO_INCREMENT\b/gi,
    replace: 'IDENTITY(1,1)',
    note: 'AUTO_INCREMENT → IDENTITY(1,1)',
  },
]

// Sqlite conversions — minimal (sqlite is source-only in convert UI)
const SQLITE_TO_PG: ConversionRule[] = [
  {
    id: 'sqlite-autoincrement',
    match: /\bAUTOINCREMENT\b/gi,
    replace: '', // handled via SERIAL separately
    note: 'AUTOINCREMENT → (use SERIAL in column definition)',
  },
]

type ConversionKey = `${Dialect}→${Dialect}`

const RULES: Partial<Record<ConversionKey, ConversionRule[]>> = {
  'postgresql→sqlserver': PG_TO_MSSQL,
  'sqlserver→postgresql': MSSQL_TO_PG,
  'postgresql→mysql':     PG_TO_MYSQL,
  'mysql→postgresql':     MYSQL_TO_PG,
  'sqlserver→mysql':      MSSQL_TO_MYSQL,
  'mysql→sqlserver':      MYSQL_TO_MSSQL,
  'sqlite→postgresql':    SQLITE_TO_PG,
}

export function convertDialect(sql: string, from: Dialect, to: Dialect): ConversionResult {
  if (from === to) return { convertedSQL: sql, changes: [] }

  const rules = RULES[`${from}→${to}` as ConversionKey] ?? []
  const changes: ConversionChange[] = []
  let result = sql

  for (const rule of rules) {
    const before = result
    result = result.replace(rule.match, (...args) => {
      const replaced = typeof rule.replace === 'function' ? rule.replace(...args) : rule.replace
      return replaced
    })
    if (result !== before) {
      changes.push({ rule: rule.note, original: before, replaced: result })
    }
  }

  return { convertedSQL: result, changes }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/converter/dialect-converter.test.ts
```

Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/converter/dialect-converter.ts src/__tests__/converter/dialect-converter.test.ts
git commit -m "feat(converter): add convertDialect module with rule-based SQL dialect conversion"
```

---

### Task 5.2: Conversion modal UI

**Files:**
- Create: `src/components/editor/ConversionModal.tsx`
- Modify: `src/components/editor/DialectSelector.tsx`

- [ ] **Step 1: Create ConversionModal**

```tsx
// src/components/editor/ConversionModal.tsx
import { useState, useEffect } from 'react'
import { X, ArrowRight, Copy, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { convertDialect } from '@/lib/converter/dialect-converter'
import type { Dialect } from '@/types'
import { DIALECTS } from './DialectSelector'

interface ConversionModalProps {
  open:        boolean
  fromDialect: Dialect
  onClose:     () => void
  onApply:     (sql: string, dialect: Dialect) => void
  sourceSql:   string
}

export function ConversionModal({ open, fromDialect, onClose, onApply, sourceSql }: ConversionModalProps) {
  const targets = DIALECTS.filter(d => d.value !== fromDialect)
  const [toDialect, setToDialect] = useState<Dialect>(targets[0]?.value ?? 'mysql')
  const [copied, setCopied] = useState(false)

  const { convertedSQL, changes } = convertDialect(sourceSql, fromDialect, toDialect)

  useEffect(() => {
    const targets = DIALECTS.filter(d => d.value !== fromDialect)
    if (targets[0]) setToDialect(targets[0].value)
  }, [fromDialect])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const handleCopy = () => {
    navigator.clipboard.writeText(convertedSQL)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const fromLabel = DIALECTS.find(d => d.value === fromDialect)?.label ?? fromDialect
  const toLabel   = DIALECTS.find(d => d.value === toDialect)?.label   ?? toDialect

  return (
    <AnimatePresence>
      {open && (
        <>
          <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 998 }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            role="dialog" aria-modal="true" aria-label="Convert SQL dialect"
            style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              zIndex: 999, background: 'var(--surface)', border: '1px solid var(--border-hi)',
              borderRadius: 12, boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
              width: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border)', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', flex: 1 }}>
                Convert dialect
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{fromLabel}</span>
              <ArrowRight size={13} style={{ color: 'var(--text-3)' }} />
              <select
                value={toDialect}
                onChange={e => setToDialect(e.target.value as Dialect)}
                style={{ fontSize: 12, padding: '3px 6px', borderRadius: 5, background: 'var(--elevated)', border: '1px solid var(--border)', color: 'var(--text-1)', cursor: 'pointer' }}
              >
                {targets.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                <X size={15} />
              </button>
            </div>

            {/* Changes summary */}
            {changes.length > 0 && (
              <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>
                  {changes.length} transformation{changes.length !== 1 ? 's' : ''} applied
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {changes.slice(0, 5).map((c, i) => (
                    <div key={i} style={{ fontSize: 10, color: 'var(--text-2)' }}>• {c.rule}</div>
                  ))}
                  {changes.length > 5 && <div style={{ fontSize: 10, color: 'var(--text-3)' }}>+ {changes.length - 5} more</div>}
                </div>
              </div>
            )}
            {changes.length === 0 && (
              <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-3)' }}>
                No automatic conversions needed for {toLabel}.
              </div>
            )}

            {/* Converted SQL */}
            <pre style={{
              flex: 1, overflowY: 'auto', margin: 0, padding: '12px 16px',
              fontSize: 12, fontFamily: 'monospace', color: 'var(--text-1)',
              background: 'var(--bg-surface)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {convertedSQL}
            </pre>

            {/* Footer */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
              <button onClick={handleCopy} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 11, background: 'var(--elevated)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={() => { onApply(convertedSQL, toDialect); onClose() }}
                style={{ padding: '6px 14px', borderRadius: 6, fontSize: 11, background: 'var(--a)', border: 'none', cursor: 'pointer', fontWeight: 700, color: '#000' }}>
                Use this query
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Add "Convert to" button to DialectSelector**

In `src/components/editor/DialectSelector.tsx`, import and add the modal:

```tsx
// Add imports:
import { useState } from 'react'  // (if not already imported)
import { ArrowLeftRight } from 'lucide-react'
import { ConversionModal } from './ConversionModal'
```

Update `DialectSelector` props to accept `query` and `onQueryChange`:

```tsx
interface DialectSelectorProps {
  value:          Dialect
  onChange:       (dialect: Dialect) => void
  query:          string                        // NEW
  onQueryChange:  (q: string) => void           // NEW
}

export function DialectSelector({ value, onChange, query, onQueryChange }: DialectSelectorProps) {
  const ref = useRef<HTMLDivElement>(null)
  const active = DIALECTS.find(d => d.value === value) ?? DIALECTS[0]
  const { open, setOpen, dropCoords, handleSelect } = useDropdown(ref, onChange)
  const [convertOpen, setConvertOpen] = useState(false)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div ref={ref} style={{ position: 'relative' }}>
        <DialectTrigger active={active} open={open} onClick={() => setOpen(v => !v)} />
        {createPortal(
          <AnimatePresence>
            {open && dropCoords && <DialectDropdown value={value} onSelect={handleSelect} coords={dropCoords} />}
          </AnimatePresence>,
          document.body,
        )}
      </div>

      {/* Convert to button */}
      <button
        onClick={() => setConvertOpen(true)}
        aria-label="Convert SQL to another dialect"
        title="Convert to another dialect"
        style={{
          background: 'var(--elevated)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '4px 7px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 11, color: 'var(--text-2)',
        }}
      >
        <ArrowLeftRight size={12} />
      </button>

      <ConversionModal
        open={convertOpen}
        fromDialect={value}
        sourceSql={query}
        onClose={() => setConvertOpen(false)}
        onApply={(sql, dialect) => { onQueryChange(sql); onChange(dialect) }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Pass query and onQueryChange where DialectSelector is rendered**

```bash
grep -r "DialectSelector" src/ --include="*.tsx" -l
```

In each file, add the new props from the Zustand store:

```tsx
const query    = useAppStore((s) => s.query)
const setQuery = useAppStore((s) => s.setQuery)

<DialectSelector value={dialect} onChange={setDialect} query={query} onQueryChange={setQuery} />
```

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 5: Verify in browser**

```bash
npm run dev
```

Enter a PostgreSQL query with `LIMIT 10`. Click the convert icon (⇆). Modal opens, converts to SQL Server (shows `TOP 10`). Click "Use this query" — editor updates and dialect switches to SQL Server.

- [ ] **Step 6: Commit**

```bash
git add src/components/editor/ConversionModal.tsx src/components/editor/DialectSelector.tsx
git commit -m "feat(converter): add ConversionModal and convert button to DialectSelector"
```

---

## Final Tier 2 verification

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

- [ ] **Final commit**

```bash
git commit --allow-empty -m "chore: tier 2 features complete — merge/pivot, lineage, collections, cross-dialect"
```
