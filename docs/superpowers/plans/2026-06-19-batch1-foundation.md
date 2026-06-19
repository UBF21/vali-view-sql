# Vali-ViewSql Batch 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold Vali-ViewSql and implement the core SQL parsing pipeline with a working interactive diagram for SELECT queries (JOINs, WHERE, GROUP BY, ORDER BY, LIMIT) across PostgreSQL, MySQL, and SQL Server.

**Architecture:** Pure client-side Vite + React 19 app. The parsing pipeline is a chain of pure functions: `dialectAdapter → node-sql-parser → astToGraph → autoLayout → React Flow`. All lib functions live in `src/lib/parser/` and are tested in isolation. UI components render the React Flow diagram. State lives in Zustand with localStorage persistence.

**Tech Stack:** Vite, React 19, TypeScript 5 strict, Tailwind CSS v4, shadcn/ui, @xyflow/react v12, node-sql-parser v4, Zustand v5, Vitest 2

---

## File Map

| File | Responsibility |
|------|----------------|
| `vite.config.ts` | Vite config: React plugin + Tailwind v4 plugin + Vitest config |
| `tsconfig.app.json` | TypeScript strict + path alias `@/*` → `src/*` |
| `src/types/index.ts` | All central TypeScript types (14 NodeTypes, Dialect, AppMode, etc.) |
| `src/index.css` | `@import "tailwindcss"` + CSS custom properties dark/light |
| `src/lib/parser/dialect-adapter.ts` | `dialectAdapter(sql, dialect): string` — normalizes syntax before parse |
| `src/lib/parser/ast-to-graph.ts` | `astToGraph(ast, dialect)` — AST → `{nodes, edges, glossary}` |
| `src/lib/parser/layout.ts` | `autoLayout(nodes, edges)` — topological position without dagre |
| `src/lib/parser/index.ts` | `parseSQL(sql, dialect): ParseResult` + Web Worker dispatch |
| `src/lib/parser/parser.worker.ts` | Web Worker — handles queries >5000 chars |
| `src/store/useAppStore.ts` | Zustand store with persist middleware |
| `src/components/diagram/nodes/index.ts` | `NODE_COLORS` map + `customNodeTypes` registry |
| `src/components/diagram/nodes/TableNode.tsx` | Table source node (memoized) |
| `src/components/diagram/nodes/JoinNode.tsx` | JOIN node (memoized) |
| `src/components/diagram/nodes/FilterNode.tsx` | WHERE/HAVING node (memoized) |
| `src/components/diagram/nodes/AggregateNode.tsx` | GROUP BY node (memoized) |
| `src/components/diagram/nodes/OutputNode.tsx` | SELECT output node (memoized) |
| `src/components/diagram/nodes/SortNode.tsx` | ORDER BY node (memoized) |
| `src/components/diagram/nodes/LimitNode.tsx` | LIMIT node (memoized) |
| `src/components/diagram/DiagramCanvas.tsx` | `<ReactFlow>` wrapper with customNodeTypes, Controls, Background |
| `src/components/editor/QueryEditor.tsx` | SQL `<textarea>` — controlled, monospace |
| `src/components/editor/DialectSelector.tsx` | PostgreSQL / MySQL / SQL Server tabs |
| `src/components/layout/Header.tsx` | Logo + Explain/Diff/Stepper mode tabs |
| `src/components/layout/AppShell.tsx` | `ResizablePanelGroup` left 45% / right 55% |
| `src/hooks/useParseQuery.ts` | Debounced reactive wrapper over `parseSQL` (800ms) |
| `src/App.tsx` | Root: wires store + `useParseQuery` + `AppShell` |
| `src/__tests__/parser/dialect-adapter.test.ts` | Unit tests for `dialectAdapter` |
| `src/__tests__/parser/ast-to-graph.test.ts` | Unit tests for `astToGraph` |
| `src/__tests__/parser/layout.test.ts` | Unit tests for `autoLayout` |
| `src/__tests__/parser/parse-sql.test.ts` | Integration tests for `parseSQL` end-to-end |

---

## Task 1: Scaffold project + install dependencies

**Files:**
- Create: everything under `vali-viewsql/` (Vite scaffold)
- Modify: `vite.config.ts`, `tsconfig.app.json`, `index.html`

- [ ] **Step 1: Create Vite project**

```bash
cd "C:\Users\fmontenegro\Documents\proyectos"
"C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" create vite@latest vali-viewsql -- --template react-ts
cd vali-viewsql
"C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" install
```

- [ ] **Step 2: Install all dependencies**

```bash
"C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" install tailwindcss @tailwindcss/vite
"C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" install @xyflow/react node-sql-parser zustand
"C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" install html-to-image framer-motion
"C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
"C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" install -D @types/node
```

- [ ] **Step 3: Initialize shadcn/ui**

```bash
"C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" exec -- shadcn@latest init
```
Cuando pregunte: TypeScript=yes, style=default, baseColor=zinc, cssVariables=yes, framework=vite

```bash
"C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" exec -- shadcn@latest add button card badge tabs tooltip select separator resizable
```

- [ ] **Step 4: Update `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/__tests__/**/*.test.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
  },
})
```

- [ ] **Step 5: Update `tsconfig.app.json` — add path alias**

Add inside `compilerOptions`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] },
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

- [ ] **Step 6: Update `index.html` title**

```html
<title>Vali-ViewSql</title>
```

- [ ] **Step 7: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold vali-viewsql with vite + react19 + ts + tailwind v4 + shadcn + xyflow + zustand + vitest"
```

---

## Task 2: Types + CSS tokens

**Files:**
- Create: `src/types/index.ts`
- Create/Replace: `src/index.css`

- [ ] **Step 1: Create `src/types/index.ts`**

```typescript
import type { Node, Edge } from '@xyflow/react'

export type Dialect = 'postgresql' | 'mysql' | 'sqlserver'

export type NodeType =
  | 'table' | 'join' | 'filter' | 'aggregate'
  | 'output' | 'sort' | 'limit' | 'subquery' | 'setop'
  | 'cte' | 'temp_table' | 'procedure' | 'param' | 'declare'
  | 'condition' | 'loop'

export type AppMode = 'explain' | 'diff' | 'stepper'

export interface SQLNodeData extends Record<string, unknown> {
  nodeType: NodeType
  label: string
  detail: string
  clause: string
  lineStart?: number
  lineEnd?: number
  isActive?: boolean
  hasIssue?: boolean
  isHighlighted?: boolean
  diffStatus?: 'added' | 'removed' | 'changed' | 'same'
  subNodes?: Node<SQLNodeData>[]
  subEdges?: Edge[]
  conditionBranch?: 'true' | 'false'
  paramDirection?: 'IN' | 'OUT' | 'INOUT'
  subGraph?: { nodes: Node<SQLNodeData>[]; edges: Edge[] }
}

export interface GlossaryEntry {
  keyword: string
  role: string
  detail: string
  lineRef?: number
}

export interface ParseResult {
  nodes: Node<SQLNodeData>[]
  edges: Edge[]
  glossary: GlossaryEntry[]
  rawAst: unknown
}

export type IssueSeverity = 'error' | 'warning' | 'info'

export interface Issue {
  id: string
  severity: IssueSeverity
  title: string
  description: string
  suggestion: string
  nodeId?: string
  dialectNote?: string
  docUrl?: string
}

export interface Suggestion {
  id: string
  category: 'index' | 'rewrite' | 'dialect' | 'performance'
  title: string
  before: string
  after: string
  impact: 'high' | 'medium' | 'low'
  reason: string
}

export interface DiffResult {
  addedNodes: string[]
  removedNodes: string[]
  changedNodes: string[]
  summary: string
}

export interface Step {
  id: string
  nodeId: string
  title: string
  description: string
  edgeIds: string[]
}

export interface Example {
  id: string
  title: string
  dialect: Dialect
  category: 'basic' | 'join' | 'cte' | 'window' | 'subquery' | 'aggregation' | 'sp' | 'temp'
  sql: string
  description: string
}
```

- [ ] **Step 2: Replace `src/index.css`**

```css
@import "tailwindcss";

:root {
  --bg-primary: #FFFFFF;
  --bg-surface: #F8F8F8;
  --bg-elevated: #F0F0F0;
  --border: rgba(0, 0, 0, 0.08);
  --border-hover: rgba(0, 0, 0, 0.16);
  --text-primary: #111111;
  --text-secondary: #555555;
  --text-muted: #999999;
  --accent: #1D9E75;
  --accent-dim: #15755A;
}

.dark {
  --bg-primary: #0F0F0F;
  --bg-surface: #1A1A1A;
  --bg-elevated: #242424;
  --border: rgba(255, 255, 255, 0.08);
  --border-hover: rgba(255, 255, 255, 0.16);
  --text-primary: #F5F5F5;
  --text-secondary: #888888;
  --text-muted: #555555;
  --accent: #5DCAA5;
  --accent-dim: #1D9E75;
}

* { box-sizing: border-box; }

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: system-ui, -apple-system, sans-serif;
  margin: 0;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts src/index.css
git commit -m "feat(types): add central types and CSS design tokens"
```

---

## Task 3: dialectAdapter (TDD)

**Files:**
- Create: `src/lib/parser/dialect-adapter.ts`
- Create: `src/__tests__/parser/dialect-adapter.test.ts`

- [ ] **Step 1: Create test file (write failing tests first)**

```typescript
// src/__tests__/parser/dialect-adapter.test.ts
import { describe, it, expect } from 'vitest'
import { dialectAdapter } from '@/lib/parser/dialect-adapter'

describe('dialectAdapter', () => {
  describe('postgresql (passthrough)', () => {
    it('returns SQL unchanged for postgresql', () => {
      const sql = 'SELECT id FROM users WHERE id = 1'
      expect(dialectAdapter(sql, 'postgresql')).toBe(sql)
    })
  })

  describe('mysql', () => {
    it('converts backtick identifiers to double quotes', () => {
      const result = dialectAdapter('SELECT `id` FROM `users`', 'mysql')
      expect(result).toBe('SELECT "id" FROM "users"')
    })

    it('leaves non-backtick SQL unchanged', () => {
      const sql = 'SELECT id FROM users'
      expect(dialectAdapter(sql, 'mysql')).toBe(sql)
    })
  })

  describe('sqlserver', () => {
    it('removes TOP N clause', () => {
      const result = dialectAdapter('SELECT TOP 10 id FROM users', 'sqlserver')
      expect(result).not.toContain('TOP')
      expect(result).toContain('SELECT')
    })

    it('removes WITH (NOLOCK) table hints', () => {
      const result = dialectAdapter('SELECT id FROM users WITH (NOLOCK)', 'sqlserver')
      expect(result).not.toContain('NOLOCK')
    })

    it('removes bracket identifiers', () => {
      const result = dialectAdapter('SELECT [id] FROM [users]', 'sqlserver')
      expect(result).toBe('SELECT id FROM users')
    })

    it('replaces ISNULL with COALESCE', () => {
      const result = dialectAdapter('SELECT ISNULL(name, \'N/A\') FROM users', 'sqlserver')
      expect(result).toContain('COALESCE')
      expect(result).not.toContain('ISNULL')
    })

    it('replaces #temp with tmp_ prefix', () => {
      const result = dialectAdapter('SELECT id FROM #orders', 'sqlserver')
      expect(result).toContain('tmp_orders')
      expect(result).not.toContain('#orders')
    })
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd "C:\Users\fmontenegro\Documents\proyectos\vali-viewsql"
"C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run test -- --reporter=verbose 2>&1 | head -30
```

Expected: `Error: Cannot find module '@/lib/parser/dialect-adapter'`

- [ ] **Step 3: Create `src/lib/parser/dialect-adapter.ts`**

```typescript
import type { Dialect } from '@/types'

export function dialectAdapter(sql: string, dialect: Dialect): string {
  if (dialect === 'sqlserver') {
    return sql
      .replace(/\bTOP\s+\d+\b/gi, '')
      .replace(/WITH\s*\(\s*NOLOCK\s*\)/gi, '')
      .replace(/\[(\w+)\]/g, '$1')
      .replace(/\bISNULL\b/gi, 'COALESCE')
      .replace(/#(\w+)/g, 'tmp_$1')
  }
  if (dialect === 'mysql') {
    return sql.replace(/`(\w+)`/g, '"$1"')
  }
  return sql
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
"C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run test -- --reporter=verbose
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/parser/dialect-adapter.ts src/__tests__/parser/dialect-adapter.test.ts
git commit -m "feat(parser): add dialectAdapter with tests — normalizes SQL syntax per dialect"
```

---

## Task 4: autoLayout (TDD)

**Files:**
- Create: `src/lib/parser/layout.ts`
- Create: `src/__tests__/parser/layout.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/__tests__/parser/layout.test.ts
import { describe, it, expect } from 'vitest'
import { autoLayout } from '@/lib/parser/layout'
import type { Node, Edge } from '@xyflow/react'
import type { SQLNodeData } from '@/types'

function makeNode(id: string): Node<SQLNodeData> {
  return {
    id,
    type: 'tableNode',
    position: { x: 0, y: 0 },
    data: { nodeType: 'table', label: id, detail: '', clause: '' },
  }
}

function makeEdge(source: string, target: string): Edge {
  return { id: `e-${source}-${target}`, source, target }
}

describe('autoLayout', () => {
  it('assigns unique positions to all nodes', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')]
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')]
    const result = autoLayout(nodes, edges)
    const positions = result.map(n => `${n.position.x},${n.position.y}`)
    const unique = new Set(positions)
    expect(unique.size).toBe(3)
  })

  it('places source nodes (no incoming edges) at level 0 (y=0)', () => {
    const nodes = [makeNode('table1'), makeNode('table2'), makeNode('join')]
    const edges = [makeEdge('table1', 'join'), makeEdge('table2', 'join')]
    const result = autoLayout(nodes, edges)
    const t1 = result.find(n => n.id === 'table1')!
    const t2 = result.find(n => n.id === 'table2')!
    expect(t1.position.y).toBe(0)
    expect(t2.position.y).toBe(0)
  })

  it('places downstream nodes at higher y than their sources', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')]
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')]
    const result = autoLayout(nodes, edges)
    const yA = result.find(n => n.id === 'a')!.position.y
    const yB = result.find(n => n.id === 'b')!.position.y
    const yC = result.find(n => n.id === 'c')!.position.y
    expect(yB).toBeGreaterThan(yA)
    expect(yC).toBeGreaterThan(yB)
  })

  it('returns the same number of nodes as input', () => {
    const nodes = [makeNode('a'), makeNode('b')]
    const edges = [makeEdge('a', 'b')]
    const result = autoLayout(nodes, edges)
    expect(result).toHaveLength(2)
  })

  it('handles a single node with no edges', () => {
    const nodes = [makeNode('solo')]
    const result = autoLayout(nodes, [])
    expect(result[0].position).toEqual({ x: 0, y: 0 })
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
"C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run test -- --reporter=verbose
```

Expected: `Cannot find module '@/lib/parser/layout'`

- [ ] **Step 3: Create `src/lib/parser/layout.ts`**

```typescript
import type { Node, Edge } from '@xyflow/react'
import type { SQLNodeData } from '@/types'

const NODE_WIDTH = 240
const NODE_HEIGHT = 90
const H_GAP = 60
const V_GAP = 80

export function autoLayout(
  nodes: Node<SQLNodeData>[],
  edges: Edge[]
): Node<SQLNodeData>[] {
  if (nodes.length === 0) return nodes

  // Assign levels via longest-path from sources
  const levels = new Map<string, number>()
  const inDegree = new Map<string, number>()
  const adjList = new Map<string, string[]>()

  for (const node of nodes) {
    inDegree.set(node.id, 0)
    adjList.set(node.id, [])
  }
  for (const edge of edges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
    adjList.get(edge.source)?.push(edge.target)
  }

  // Kahn's algorithm — topological order
  const queue: string[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) { queue.push(id); levels.set(id, 0) }
  }

  while (queue.length > 0) {
    const current = queue.shift()!
    const currentLevel = levels.get(current) ?? 0
    for (const neighbor of adjList.get(current) ?? []) {
      const newLevel = currentLevel + 1
      if ((levels.get(neighbor) ?? -1) < newLevel) {
        levels.set(neighbor, newLevel)
      }
      const newDeg = (inDegree.get(neighbor) ?? 0) - 1
      inDegree.set(neighbor, newDeg)
      if (newDeg === 0) queue.push(neighbor)
    }
  }

  // Nodes with no level assigned (isolated) → level 0
  for (const node of nodes) {
    if (!levels.has(node.id)) levels.set(node.id, 0)
  }

  // Group by level
  const byLevel = new Map<number, string[]>()
  for (const [id, level] of levels) {
    if (!byLevel.has(level)) byLevel.set(level, [])
    byLevel.get(level)!.push(id)
  }

  // Assign x/y positions centered per level
  const positions = new Map<string, { x: number; y: number }>()
  for (const [level, levelNodes] of byLevel) {
    const totalWidth = levelNodes.length * NODE_WIDTH + (levelNodes.length - 1) * H_GAP
    const startX = -totalWidth / 2
    levelNodes.forEach((id, i) => {
      positions.set(id, {
        x: startX + i * (NODE_WIDTH + H_GAP),
        y: level * (NODE_HEIGHT + V_GAP),
      })
    })
  }

  return nodes.map(node => ({
    ...node,
    position: positions.get(node.id) ?? { x: 0, y: 0 },
  }))
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
"C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run test -- --reporter=verbose
```

Expected: all layout tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/parser/layout.ts src/__tests__/parser/layout.test.ts
git commit -m "feat(parser): add autoLayout topological positioning with tests"
```

---

## Task 5: astToGraph (TDD)

**Files:**
- Create: `src/lib/parser/ast-to-graph.ts`
- Create: `src/__tests__/parser/ast-to-graph.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/__tests__/parser/ast-to-graph.test.ts
import { describe, it, expect } from 'vitest'
import { Parser } from 'node-sql-parser'
import { astToGraph } from '@/lib/parser/ast-to-graph'

const parser = new Parser()

function parse(sql: string, db = 'PostgresSQL') {
  return parser.astify(sql, { database: db })
}

describe('astToGraph — SELECT básico', () => {
  it('creates a table node and output node for simple SELECT', () => {
    const ast = parse('SELECT id, name FROM users')
    const { nodes } = astToGraph(ast, 'postgresql')
    const tableNode = nodes.find(n => n.data.nodeType === 'table')
    const outputNode = nodes.find(n => n.data.nodeType === 'output')
    expect(tableNode).toBeDefined()
    expect(tableNode?.data.label).toBe('users')
    expect(outputNode).toBeDefined()
    expect(outputNode?.data.nodeType).toBe('output')
  })

  it('creates a filter node for WHERE clause', () => {
    const ast = parse('SELECT id FROM users WHERE id = 1')
    const { nodes } = astToGraph(ast, 'postgresql')
    const filterNode = nodes.find(n => n.data.nodeType === 'filter')
    expect(filterNode).toBeDefined()
    expect(filterNode?.data.label).toBe('WHERE')
  })

  it('creates a join node for INNER JOIN', () => {
    const ast = parse('SELECT o.id FROM orders o JOIN users u ON o.user_id = u.id')
    const { nodes } = astToGraph(ast, 'postgresql')
    const joinNode = nodes.find(n => n.data.nodeType === 'join')
    expect(joinNode).toBeDefined()
  })

  it('creates an aggregate node for GROUP BY', () => {
    const ast = parse('SELECT category, COUNT(*) FROM products GROUP BY category')
    const { nodes } = astToGraph(ast, 'postgresql')
    const aggNode = nodes.find(n => n.data.nodeType === 'aggregate')
    expect(aggNode).toBeDefined()
    expect(aggNode?.data.label).toBe('GROUP BY')
  })

  it('creates a sort node for ORDER BY', () => {
    const ast = parse('SELECT id FROM users ORDER BY id DESC')
    const { nodes } = astToGraph(ast, 'postgresql')
    const sortNode = nodes.find(n => n.data.nodeType === 'sort')
    expect(sortNode).toBeDefined()
    expect(sortNode?.data.label).toBe('ORDER BY')
  })

  it('creates a limit node for LIMIT', () => {
    const ast = parse('SELECT id FROM users LIMIT 10')
    const { nodes } = astToGraph(ast, 'postgresql')
    const limitNode = nodes.find(n => n.data.nodeType === 'limit')
    expect(limitNode).toBeDefined()
    expect(limitNode?.data.label).toBe('LIMIT')
  })

  it('creates edges connecting the pipeline', () => {
    const ast = parse('SELECT id FROM users WHERE id = 1')
    const { nodes, edges } = astToGraph(ast, 'postgresql')
    expect(edges.length).toBeGreaterThan(0)
    // All edge sources and targets must reference existing node IDs
    const nodeIds = new Set(nodes.map(n => n.id))
    for (const edge of edges) {
      expect(nodeIds.has(edge.source)).toBe(true)
      expect(nodeIds.has(edge.target)).toBe(true)
    }
  })

  it('generates deterministic node IDs on repeated calls', () => {
    const ast = parse('SELECT id FROM users WHERE id = 1')
    const result1 = astToGraph(ast, 'postgresql')
    const result2 = astToGraph(ast, 'postgresql')
    const ids1 = result1.nodes.map(n => n.id)
    const ids2 = result2.nodes.map(n => n.id)
    expect(ids1).toEqual(ids2)
  })

  it('populates the glossary', () => {
    const ast = parse('SELECT id FROM users WHERE id = 1')
    const { glossary } = astToGraph(ast, 'postgresql')
    expect(glossary.length).toBeGreaterThan(0)
    const keywords = glossary.map(g => g.keyword)
    expect(keywords).toContain('FROM')
    expect(keywords).toContain('WHERE')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
"C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run test -- --reporter=verbose
```

Expected: `Cannot find module '@/lib/parser/ast-to-graph'`

- [ ] **Step 3: Create `src/lib/parser/ast-to-graph.ts`**

```typescript
import { MarkerType, type Node, type Edge } from '@xyflow/react'
import type { Dialect, SQLNodeData, GlossaryEntry } from '@/types'

interface GraphResult {
  nodes: Node<SQLNodeData>[]
  edges: Edge[]
  glossary: GlossaryEntry[]
}

// Counter is reset per call via the closure pattern below
let _counter = 0
function nextId(type: string): string {
  return `${type}-${_counter++}`
}

export function astToGraph(ast: unknown, _dialect: Dialect): GraphResult {
  _counter = 0
  const nodes: Node<SQLNodeData>[] = []
  const edges: Edge[] = []
  const glossary: GlossaryEntry[] = []

  const a = ast as Record<string, unknown>

  // Normalize: node-sql-parser may return an array for multi-statement SQL
  const stmt = Array.isArray(a) ? (a[0] as Record<string, unknown>) : a

  if (stmt?.type !== 'select') {
    return { nodes, edges, glossary }
  }

  let lastNodeId: string | null = null
  const fromSources: string[] = []

  // FROM
  const fromList = stmt.from as Array<Record<string, unknown>> | null
  if (Array.isArray(fromList)) {
    for (const fromItem of fromList) {
      const tableName = (fromItem.table as string) ?? 'table'
      const alias = fromItem.as as string | null
      const id = nextId('table')
      nodes.push({
        id,
        type: 'tableNode',
        position: { x: 0, y: 0 },
        data: {
          nodeType: 'table',
          label: tableName,
          detail: alias ? `Alias: ${alias}` : 'Source table',
          clause: `FROM ${tableName}${alias ? ` AS ${alias}` : ''}`,
        },
      })
      fromSources.push(id)
      glossary.push({
        keyword: 'FROM',
        role: 'Source',
        detail: `Specifies "${tableName}" as the source table`,
      })
    }
  }

  if (fromSources.length > 0) lastNodeId = fromSources[fromSources.length - 1]

  // JOINs
  const joins = stmt.join as Array<Record<string, unknown>> | null
  if (Array.isArray(joins) && joins.length > 0) {
    let prevId = fromSources.length > 0 ? null : null
    for (let i = 0; i < joins.length; i++) {
      const j = joins[i]
      const joinType = (j.join as string) ?? 'INNER JOIN'
      const joinTable = (j.table as string | Record<string, unknown>)
      const tableName = typeof joinTable === 'string'
        ? joinTable
        : (joinTable?.table as string) ?? 'table'
      const id = nextId('join')

      nodes.push({
        id,
        type: 'joinNode',
        position: { x: 0, y: 0 },
        data: {
          nodeType: 'join',
          label: joinType,
          detail: `Joins with "${tableName}"`,
          clause: `${joinType} ${tableName} ON ${stringifyCondition(j.on)}`,
        },
      })

      if (i === 0) {
        // Connect all FROM sources to first join
        for (const sourceId of fromSources) {
          edges.push(makeJoinEdge(sourceId, id))
        }
      } else if (prevId) {
        edges.push(makeJoinEdge(prevId, id))
      }

      prevId = id
      lastNodeId = id
      glossary.push({
        keyword: joinType.split(' ')[0],
        role: 'Join',
        detail: `Combines rows based on a matching column`,
      })
    }
  }

  // WHERE
  if (stmt.where && lastNodeId) {
    const id = nextId('filter')
    nodes.push({
      id,
      type: 'filterNode',
      position: { x: 0, y: 0 },
      data: {
        nodeType: 'filter',
        label: 'WHERE',
        detail: stringifyCondition(stmt.where),
        clause: `WHERE ${stringifyCondition(stmt.where)}`,
      },
    })
    edges.push(makeFilterEdge(lastNodeId, id))
    lastNodeId = id
    glossary.push({ keyword: 'WHERE', role: 'Filter', detail: 'Filters rows before aggregation' })
  }

  // GROUP BY
  const groupby = stmt.groupby as Array<unknown> | null
  if (Array.isArray(groupby) && groupby.length > 0 && lastNodeId) {
    const cols = groupby
      .map((g) => {
        const gc = g as Record<string, unknown>
        return (gc.column as string) ?? (gc.expr as Record<string, unknown>)?.column as string ?? '?'
      })
      .join(', ')
    const id = nextId('aggregate')
    nodes.push({
      id,
      type: 'aggregateNode',
      position: { x: 0, y: 0 },
      data: {
        nodeType: 'aggregate',
        label: 'GROUP BY',
        detail: `Groups by: ${cols}`,
        clause: `GROUP BY ${cols}`,
      },
    })
    edges.push(makeDataEdge(lastNodeId, id))
    lastNodeId = id
    glossary.push({ keyword: 'GROUP BY', role: 'Aggregation', detail: 'Groups rows by one or more columns' })
  }

  // HAVING
  if (stmt.having && lastNodeId) {
    const id = nextId('filter')
    nodes.push({
      id,
      type: 'filterNode',
      position: { x: 0, y: 0 },
      data: {
        nodeType: 'filter',
        label: 'HAVING',
        detail: stringifyCondition(stmt.having),
        clause: `HAVING ${stringifyCondition(stmt.having)}`,
      },
    })
    edges.push(makeFilterEdge(lastNodeId, id))
    lastNodeId = id
    glossary.push({ keyword: 'HAVING', role: 'Filter', detail: 'Filters groups after aggregation' })
  }

  // SELECT output
  if (lastNodeId) {
    const colsRaw = stmt.columns
    let colNames: string[]
    if (colsRaw === '*' || (Array.isArray(colsRaw) && colsRaw.length === 0)) {
      colNames = ['*']
    } else if (Array.isArray(colsRaw)) {
      colNames = (colsRaw as Array<Record<string, unknown>>).map((c) => {
        if (c.as) return c.as as string
        const expr = c.expr as Record<string, unknown> | undefined
        return (expr?.column as string) ?? (expr?.name as string) ?? '*'
      })
    } else {
      colNames = ['*']
    }
    const id = nextId('output')
    const preview = colNames.slice(0, 4).join(', ') + (colNames.length > 4 ? '…' : '')
    nodes.push({
      id,
      type: 'outputNode',
      position: { x: 0, y: 0 },
      data: {
        nodeType: 'output',
        label: 'SELECT',
        detail: `Returns: ${preview}`,
        clause: `SELECT ${colNames.join(', ')}`,
      },
    })
    edges.push(makeDataEdge(lastNodeId, id))
    lastNodeId = id
    glossary.push({ keyword: 'SELECT', role: 'Projection', detail: 'Specifies which columns to return' })
  }

  // ORDER BY
  const orderby = stmt.orderby as Array<unknown> | null
  if (Array.isArray(orderby) && orderby.length > 0 && lastNodeId) {
    const cols = orderby
      .map((o) => {
        const oc = o as Record<string, unknown>
        const expr = oc.expr as Record<string, unknown> | undefined
        const col = (expr?.column as string) ?? '?'
        const dir = (oc.type as string) ?? 'ASC'
        return `${col} ${dir}`
      })
      .join(', ')
    const id = nextId('sort')
    nodes.push({
      id,
      type: 'sortNode',
      position: { x: 0, y: 0 },
      data: {
        nodeType: 'sort',
        label: 'ORDER BY',
        detail: cols,
        clause: `ORDER BY ${cols}`,
      },
    })
    edges.push(makeDataEdge(lastNodeId, id))
    lastNodeId = id
    glossary.push({ keyword: 'ORDER BY', role: 'Sorting', detail: 'Sorts the result set' })
  }

  // LIMIT
  if (stmt.limit && lastNodeId) {
    const limitRaw = stmt.limit as Record<string, unknown>
    const valArr = limitRaw.value as Array<Record<string, unknown>> | undefined
    const val = valArr?.[0]?.value ?? limitRaw.value ?? '?'
    const id = nextId('limit')
    nodes.push({
      id,
      type: 'limitNode',
      position: { x: 0, y: 0 },
      data: {
        nodeType: 'limit',
        label: 'LIMIT',
        detail: `Returns at most ${val} rows`,
        clause: `LIMIT ${val}`,
      },
    })
    edges.push(makeDataEdge(lastNodeId, id))
    glossary.push({ keyword: 'LIMIT', role: 'Pagination', detail: 'Restricts the number of returned rows' })
  }

  return { nodes, edges, glossary }
}

// ─── Edge factories ───────────────────────────────────────────────────────────

function makeDataEdge(source: string, target: string): Edge {
  return {
    id: `e-${source}-${target}`,
    source,
    target,
    animated: false,
    style: { stroke: '#5F5E5A', strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#5F5E5A' },
  }
}

function makeJoinEdge(source: string, target: string): Edge {
  return {
    id: `e-${source}-${target}`,
    source,
    target,
    animated: true,
    style: { stroke: '#5DCAA5', strokeWidth: 1.5, strokeDasharray: '5,4' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#5DCAA5' },
  }
}

function makeFilterEdge(source: string, target: string): Edge {
  return {
    id: `e-${source}-${target}`,
    source,
    target,
    animated: false,
    style: { stroke: '#EF9F27', strokeWidth: 1.5, strokeDasharray: '4,3' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#EF9F27' },
  }
}

// ─── Condition stringifier ────────────────────────────────────────────────────

function stringifyCondition(cond: unknown): string {
  if (!cond) return ''
  if (typeof cond === 'string') return cond
  const c = cond as Record<string, unknown>
  if (c.type === 'binary_expr') {
    return `${stringifyCondition(c.left)} ${c.operator} ${stringifyCondition(c.right)}`
  }
  if (c.type === 'column_ref') {
    const table = c.table ? `${c.table}.` : ''
    return `${table}${c.column}`
  }
  if (c.type === 'number') return String(c.value)
  if (c.type === 'single_quote_string' || c.type === 'string') return `'${c.value}'`
  return String(c.value ?? JSON.stringify(c))
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
"C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run test -- --reporter=verbose
```

Expected: all 9 astToGraph tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/parser/ast-to-graph.ts src/__tests__/parser/ast-to-graph.test.ts
git commit -m "feat(parser): add astToGraph — AST to React Flow nodes/edges with tests"
```

---

## Task 6: parseSQL entry point + integration tests + Web Worker

**Files:**
- Create: `src/lib/parser/index.ts`
- Create: `src/lib/parser/parser.worker.ts`
- Create: `src/__tests__/parser/parse-sql.test.ts`

- [ ] **Step 1: Create `src/lib/parser/index.ts`**

```typescript
import { Parser } from 'node-sql-parser'
import { dialectAdapter } from './dialect-adapter'
import { astToGraph } from './ast-to-graph'
import { autoLayout } from './layout'
import type { Dialect, ParseResult, SQLNodeData } from '@/types'
import type { Node } from '@xyflow/react'

const parser = new Parser()

function dialectToDb(dialect: Dialect): string {
  const map: Record<Dialect, string> = {
    postgresql: 'PostgresSQL',
    mysql: 'MySQL',
    sqlserver: 'TransactSQL',
  }
  return map[dialect]
}

function buildErrorResult(sql: string, err: unknown): ParseResult {
  const message = err instanceof Error ? err.message : 'Parse error'
  const errorNode: Node<SQLNodeData> = {
    id: 'error-0',
    type: 'outputNode',
    position: { x: 0, y: 0 },
    data: {
      nodeType: 'output',
      label: 'Parse Error',
      detail: message.slice(0, 120),
      clause: sql.slice(0, 80),
      hasIssue: true,
    },
  }
  return { nodes: [errorNode], edges: [], glossary: [], rawAst: null }
}

export function parseSQL(sql: string, dialect: Dialect): ParseResult {
  if (!sql.trim()) return { nodes: [], edges: [], glossary: [], rawAst: null }

  const normalizedSql = dialectAdapter(sql, dialect)

  let ast: unknown
  try {
    ast = parser.astify(normalizedSql, { database: dialectToDb(dialect) })
  } catch (err) {
    return buildErrorResult(sql, err)
  }

  const { nodes, edges, glossary } = astToGraph(ast, dialect)
  const positionedNodes = autoLayout(nodes, edges)

  return { nodes: positionedNodes, edges, glossary, rawAst: ast }
}

// ─── Web Worker dispatch ──────────────────────────────────────────────────────
// Para queries >5000 chars se delega al worker para evitar freeze del UI.
// El caller recibe una Promise en ambos casos para uniformidad.

let _worker: Worker | null = null

function getWorker(): Worker {
  if (!_worker) {
    _worker = new Worker(new URL('./parser.worker.ts', import.meta.url), { type: 'module' })
  }
  return _worker
}

export function parseSQLAsync(sql: string, dialect: Dialect): Promise<ParseResult> {
  if (sql.length <= 5000 || typeof Worker === 'undefined') {
    return Promise.resolve(parseSQL(sql, dialect))
  }

  return new Promise((resolve) => {
    const worker = getWorker()
    const handler = (e: MessageEvent<ParseResult>) => {
      worker.removeEventListener('message', handler)
      resolve(e.data)
    }
    worker.addEventListener('message', handler)
    worker.postMessage({ sql, dialect })
  })
}
```

- [ ] **Step 2: Create `src/lib/parser/parser.worker.ts`**

```typescript
import { parseSQL } from './index'
import type { Dialect } from '@/types'

self.addEventListener('message', (e: MessageEvent<{ sql: string; dialect: Dialect }>) => {
  const { sql, dialect } = e.data
  const result = parseSQL(sql, dialect)
  self.postMessage(result)
})
```

- [ ] **Step 3: Create integration tests**

```typescript
// src/__tests__/parser/parse-sql.test.ts
import { describe, it, expect } from 'vitest'
import { parseSQL } from '@/lib/parser/index'

describe('parseSQL — PostgreSQL', () => {
  it('parses a basic SELECT', () => {
    const result = parseSQL('SELECT id, name FROM users', 'postgresql')
    expect(result.nodes.length).toBeGreaterThan(0)
    expect(result.edges.length).toBeGreaterThan(0)
    expect(result.rawAst).not.toBeNull()
  })

  it('returns error node for invalid SQL', () => {
    const result = parseSQL('THIS IS NOT SQL AT ALL !!!', 'postgresql')
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0].data.hasIssue).toBe(true)
    expect(result.edges).toHaveLength(0)
  })

  it('returns empty result for empty string', () => {
    const result = parseSQL('', 'postgresql')
    expect(result.nodes).toHaveLength(0)
  })

  it('parses LEFT JOIN query', () => {
    const sql = 'SELECT o.id, u.name FROM orders o LEFT JOIN users u ON o.user_id = u.id'
    const result = parseSQL(sql, 'postgresql')
    const joinNode = result.nodes.find(n => n.data.nodeType === 'join')
    expect(joinNode).toBeDefined()
    expect(joinNode?.data.label).toContain('JOIN')
  })

  it('positions all nodes (no zero-position nodes except single node)', () => {
    const sql = 'SELECT id FROM users WHERE id > 0 ORDER BY id LIMIT 5'
    const result = parseSQL(sql, 'postgresql')
    expect(result.nodes.length).toBeGreaterThan(2)
    // Nodes at different levels should have different y positions
    const ys = new Set(result.nodes.map(n => n.position.y))
    expect(ys.size).toBeGreaterThan(1)
  })
})

describe('parseSQL — MySQL', () => {
  it('parses backtick identifiers', () => {
    const result = parseSQL('SELECT `id` FROM `users`', 'mysql')
    expect(result.nodes.length).toBeGreaterThan(0)
    expect(result.rawAst).not.toBeNull()
  })
})

describe('parseSQL — SQL Server', () => {
  it('handles bracket identifiers', () => {
    const result = parseSQL('SELECT [id], [name] FROM [users]', 'sqlserver')
    expect(result.nodes.length).toBeGreaterThan(0)
  })

  it('handles NOLOCK hint', () => {
    const result = parseSQL('SELECT id FROM users WITH (NOLOCK)', 'sqlserver')
    expect(result.nodes.length).toBeGreaterThan(0)
    expect(result.rawAst).not.toBeNull()
  })
})
```

- [ ] **Step 4: Run all tests — expect PASS**

```bash
"C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run test -- --reporter=verbose
```

Expected: all tests pass (dialectAdapter + layout + astToGraph + parseSQL).

- [ ] **Step 5: Commit**

```bash
git add src/lib/parser/index.ts src/lib/parser/parser.worker.ts src/__tests__/parser/parse-sql.test.ts
git commit -m "feat(parser): add parseSQL entry point + web worker + integration tests"
```

---

## Task 7: Zustand store

**Files:**
- Create: `src/store/useAppStore.ts`

- [ ] **Step 1: Create `src/store/useAppStore.ts`**

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Dialect, AppMode, ParseResult, Issue, Suggestion } from '@/types'

interface HistoryEntry {
  query: string
  dialect: Dialect
  timestamp: number
}

interface AppStore {
  // Input
  dialect: Dialect
  query: string
  queryB: string
  mode: AppMode
  theme: 'light' | 'dark'

  // Output
  parseResult: ParseResult | null
  issues: Issue[]
  suggestions: Suggestion[]
  isLoading: boolean
  parseError: string | null

  // History
  history: HistoryEntry[]

  // Actions
  setDialect: (d: Dialect) => void
  setQuery: (q: string) => void
  setQueryB: (q: string) => void
  setMode: (m: AppMode) => void
  setTheme: (t: 'light' | 'dark') => void
  setParseResult: (r: ParseResult | null) => void
  setIssues: (i: Issue[]) => void
  setSuggestions: (s: Suggestion[]) => void
  setIsLoading: (v: boolean) => void
  setParseError: (e: string | null) => void
  addToHistory: (query: string, dialect: Dialect) => void
  clearHistory: () => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      dialect: 'postgresql',
      query: '',
      queryB: '',
      mode: 'explain',
      theme: 'dark',
      parseResult: null,
      issues: [],
      suggestions: [],
      isLoading: false,
      parseError: null,
      history: [],

      setDialect: (dialect) => set({ dialect }),
      setQuery: (query) => set({ query }),
      setQueryB: (queryB) => set({ queryB }),
      setMode: (mode) => set({ mode }),
      setTheme: (theme) => set({ theme }),
      setParseResult: (parseResult) => set({ parseResult }),
      setIssues: (issues) => set({ issues }),
      setSuggestions: (suggestions) => set({ suggestions }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setParseError: (parseError) => set({ parseError }),
      addToHistory: (query, dialect) =>
        set((state) => ({
          history: [
            { query, dialect, timestamp: Date.now() },
            ...state.history.filter((h) => h.query !== query).slice(0, 9),
          ],
        })),
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'vali-viewsql-store',
      partialize: (state) => ({
        history: state.history,
        dialect: state.dialect,
        theme: state.theme,
      }),
    }
  )
)
```

- [ ] **Step 2: Commit**

```bash
git add src/store/useAppStore.ts
git commit -m "feat(store): add Zustand store with persist for dialect, theme, history"
```

---

## Task 8: NODE_COLORS + node registry

**Files:**
- Create: `src/components/diagram/nodes/index.ts`

- [ ] **Step 1: Create `src/components/diagram/nodes/index.ts`**

```typescript
import type { NodeType } from '@/types'
import { TableNode } from './TableNode'
import { JoinNode } from './JoinNode'
import { FilterNode } from './FilterNode'
import { AggregateNode } from './AggregateNode'
import { OutputNode } from './OutputNode'
import { SortNode } from './SortNode'
import { LimitNode } from './LimitNode'

export const NODE_COLORS: Record<NodeType, {
  bg: string
  border: string
  text: string
  icon: string
  borderStyle?: string
}> = {
  table:     { bg: '#E1F5EE', border: '#5DCAA5', text: '#085041', icon: '⊞' },
  join:      { bg: '#EEEDFE', border: '#AFA9EC', text: '#3C3489', icon: '⋈' },
  filter:    { bg: '#FAEEDA', border: '#EF9F27', text: '#412402', icon: '▽' },
  aggregate: { bg: '#FAECE7', border: '#F0997B', text: '#712B13', icon: '∑' },
  output:    { bg: '#E6F1FB', border: '#85B7EB', text: '#0C447C', icon: '→' },
  sort:      { bg: '#EEEDFE', border: '#AFA9EC', text: '#3C3489', icon: '↕' },
  limit:     { bg: '#F1EFE8', border: '#B4B2A9', text: '#444441', icon: '#' },
  subquery:  { bg: '#FBEAF0', border: '#ED93B1', text: '#72243E', icon: '⊂' },
  setop:     { bg: '#F1EFE8', border: '#B4B2A9', text: '#444441', icon: '∪' },
  cte:       { bg: '#F0EEFF', border: '#8B7CF8', text: '#3B2F8A', icon: '⟳' },
  temp_table:{ bg: '#E8F4F0', border: '#5DCAA5', text: '#085041', icon: '⊡', borderStyle: 'dashed' },
  procedure: { bg: '#1A1A2E', border: '#6366F1', text: '#E0E7FF', icon: 'λ' },
  param:     { bg: '#EEF2FF', border: '#818CF8', text: '#312E81', icon: '→' },
  declare:   { bg: '#F5F3FF', border: '#A78BFA', text: '#4C1D95', icon: '$' },
  condition: { bg: '#FFF7ED', border: '#FB923C', text: '#7C2D12', icon: '◇' },
  loop:      { bg: '#FFF1F2', border: '#FB7185', text: '#881337', icon: '↺' },
}

export const customNodeTypes = {
  tableNode: TableNode,
  joinNode: JoinNode,
  filterNode: FilterNode,
  aggregateNode: AggregateNode,
  outputNode: OutputNode,
  sortNode: SortNode,
  limitNode: LimitNode,
}
```

- [ ] **Step 2: Commit placeholder (will update after node components)**

```bash
git add src/components/diagram/nodes/index.ts
git commit -m "feat(nodes): add NODE_COLORS map and customNodeTypes registry"
```

---

## Task 9: React Flow node components (7 nodes)

**Files:**
- Create: `src/components/diagram/nodes/TableNode.tsx`
- Create: `src/components/diagram/nodes/JoinNode.tsx`
- Create: `src/components/diagram/nodes/FilterNode.tsx`
- Create: `src/components/diagram/nodes/AggregateNode.tsx`
- Create: `src/components/diagram/nodes/OutputNode.tsx`
- Create: `src/components/diagram/nodes/SortNode.tsx`
- Create: `src/components/diagram/nodes/LimitNode.tsx`

- [ ] **Step 1: Create `src/components/diagram/nodes/TableNode.tsx`**

```tsx
import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Badge } from '@/components/ui/badge'
import { NODE_COLORS } from './index'
import type { SQLNodeData } from '@/types'

export const TableNode = memo(function TableNode({ data, selected }: NodeProps<SQLNodeData>) {
  const colors = NODE_COLORS.table
  return (
    <div
      style={{
        background: colors.bg,
        border: `1.5px solid ${data.hasIssue ? '#E24B4A' : colors.border}`,
        borderRadius: 8,
        padding: '10px 14px',
        minWidth: 200,
        maxWidth: 260,
        opacity: data.isActive === false ? 0.3 : 1,
        transition: 'opacity 0.3s, border-color 0.2s',
        outline: selected ? `2px solid ${colors.border}` : 'none',
        outlineOffset: 2,
      }}
    >
      <Handle type="source" position={Position.Bottom} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 12 }}>{colors.icon}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: colors.text, fontFamily: 'monospace' }}>
          {data.label}
        </span>
        {data.hasIssue && (
          <Badge variant="destructive" style={{ fontSize: 10, padding: '0 4px' }}>!</Badge>
        )}
      </div>
      <p style={{ fontSize: 11, color: colors.text, margin: 0, lineHeight: 1.4, opacity: 0.75 }}>
        {data.detail}
      </p>
    </div>
  )
})
```

- [ ] **Step 2: Create `src/components/diagram/nodes/JoinNode.tsx`**

```tsx
import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NODE_COLORS } from './index'
import type { SQLNodeData } from '@/types'

export const JoinNode = memo(function JoinNode({ data, selected }: NodeProps<SQLNodeData>) {
  const colors = NODE_COLORS.join
  return (
    <div
      style={{
        background: colors.bg,
        border: `1.5px solid ${data.hasIssue ? '#E24B4A' : colors.border}`,
        borderRadius: 8,
        padding: '10px 14px',
        minWidth: 200,
        maxWidth: 260,
        opacity: data.isActive === false ? 0.3 : 1,
        transition: 'opacity 0.3s',
        outline: selected ? `2px solid ${colors.border}` : 'none',
        outlineOffset: 2,
      }}
    >
      <Handle type="target" position={Position.Top} id="left" style={{ left: '30%' }} />
      <Handle type="target" position={Position.Top} id="right" style={{ left: '70%' }} />
      <Handle type="source" position={Position.Bottom} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 12 }}>{colors.icon}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: colors.text, fontFamily: 'monospace' }}>
          {data.label}
        </span>
      </div>
      <p style={{ fontSize: 11, color: colors.text, margin: 0, lineHeight: 1.4, opacity: 0.75 }}>
        {data.detail}
      </p>
    </div>
  )
})
```

- [ ] **Step 3: Create `FilterNode`, `AggregateNode`, `OutputNode`, `SortNode`, `LimitNode`**

All five follow the same pattern with their respective NODE_COLORS key and Handle configuration. FilterNode gets a 3px left accent border.

```tsx
// src/components/diagram/nodes/FilterNode.tsx
import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NODE_COLORS } from './index'
import type { SQLNodeData } from '@/types'

export const FilterNode = memo(function FilterNode({ data, selected }: NodeProps<SQLNodeData>) {
  const colors = NODE_COLORS.filter
  return (
    <div
      style={{
        background: colors.bg,
        border: `1.5px solid ${data.hasIssue ? '#E24B4A' : colors.border}`,
        borderLeft: `3px solid ${colors.border}`,
        borderRadius: 8,
        padding: '10px 14px',
        minWidth: 200,
        maxWidth: 260,
        opacity: data.isActive === false ? 0.3 : 1,
        transition: 'opacity 0.3s',
        outline: selected ? `2px solid ${colors.border}` : 'none',
        outlineOffset: 2,
      }}
    >
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 12 }}>{colors.icon}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: colors.text, fontFamily: 'monospace' }}>
          {data.label}
        </span>
      </div>
      <p style={{ fontSize: 11, color: colors.text, margin: 0, lineHeight: 1.4, opacity: 0.75 }}>
        {data.detail}
      </p>
    </div>
  )
})
```

```tsx
// src/components/diagram/nodes/AggregateNode.tsx
import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NODE_COLORS } from './index'
import type { SQLNodeData } from '@/types'

export const AggregateNode = memo(function AggregateNode({ data, selected }: NodeProps<SQLNodeData>) {
  const colors = NODE_COLORS.aggregate
  return (
    <div style={{
      background: colors.bg, border: `1.5px solid ${colors.border}`, borderRadius: 8,
      padding: '10px 14px', minWidth: 200, maxWidth: 260,
      opacity: data.isActive === false ? 0.3 : 1, transition: 'opacity 0.3s',
      outline: selected ? `2px solid ${colors.border}` : 'none', outlineOffset: 2,
    }}>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 12 }}>{colors.icon}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: colors.text, fontFamily: 'monospace' }}>{data.label}</span>
      </div>
      <p style={{ fontSize: 11, color: colors.text, margin: 0, lineHeight: 1.4, opacity: 0.75 }}>{data.detail}</p>
    </div>
  )
})
```

```tsx
// src/components/diagram/nodes/OutputNode.tsx
import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NODE_COLORS } from './index'
import type { SQLNodeData } from '@/types'

export const OutputNode = memo(function OutputNode({ data, selected }: NodeProps<SQLNodeData>) {
  const colors = NODE_COLORS.output
  return (
    <div style={{
      background: colors.bg, border: `1.5px solid ${colors.border}`, borderRadius: 8,
      padding: '12px 16px', minWidth: 220, maxWidth: 280,
      opacity: data.isActive === false ? 0.3 : 1, transition: 'opacity 0.3s',
      outline: selected ? `2px solid ${colors.border}` : 'none', outlineOffset: 2,
    }}>
      <Handle type="target" position={Position.Top} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 13 }}>{colors.icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: colors.text, fontFamily: 'monospace' }}>{data.label}</span>
      </div>
      <p style={{ fontSize: 11, color: colors.text, margin: 0, lineHeight: 1.4, opacity: 0.75 }}>{data.detail}</p>
    </div>
  )
})
```

```tsx
// src/components/diagram/nodes/SortNode.tsx
import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NODE_COLORS } from './index'
import type { SQLNodeData } from '@/types'

export const SortNode = memo(function SortNode({ data, selected }: NodeProps<SQLNodeData>) {
  const colors = NODE_COLORS.sort
  return (
    <div style={{
      background: colors.bg, border: `1.5px solid ${colors.border}`, borderRadius: 8,
      padding: '10px 14px', minWidth: 200, maxWidth: 260,
      opacity: data.isActive === false ? 0.3 : 1, transition: 'opacity 0.3s',
      outline: selected ? `2px solid ${colors.border}` : 'none', outlineOffset: 2,
    }}>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 12 }}>{colors.icon}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: colors.text, fontFamily: 'monospace' }}>{data.label}</span>
      </div>
      <p style={{ fontSize: 11, color: colors.text, margin: 0, lineHeight: 1.4, opacity: 0.75 }}>{data.detail}</p>
    </div>
  )
})
```

```tsx
// src/components/diagram/nodes/LimitNode.tsx
import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NODE_COLORS } from './index'
import type { SQLNodeData } from '@/types'

export const LimitNode = memo(function LimitNode({ data, selected }: NodeProps<SQLNodeData>) {
  const colors = NODE_COLORS.limit
  return (
    <div style={{
      background: colors.bg, border: `1.5px solid ${colors.border}`, borderRadius: 8,
      padding: '10px 14px', minWidth: 200, maxWidth: 260,
      opacity: data.isActive === false ? 0.3 : 1, transition: 'opacity 0.3s',
      outline: selected ? `2px solid ${colors.border}` : 'none', outlineOffset: 2,
    }}>
      <Handle type="target" position={Position.Top} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 12 }}>{colors.icon}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: colors.text, fontFamily: 'monospace' }}>{data.label}</span>
      </div>
      <p style={{ fontSize: 11, color: colors.text, margin: 0, lineHeight: 1.4, opacity: 0.75 }}>{data.detail}</p>
    </div>
  )
})
```

- [ ] **Step 4: Commit**

```bash
git add src/components/diagram/nodes/
git commit -m "feat(nodes): add 7 memoized React Flow node components with NODE_COLORS"
```

---

## Task 10: DiagramCanvas

**Files:**
- Create: `src/components/diagram/DiagramCanvas.tsx`

- [ ] **Step 1: Create `src/components/diagram/DiagramCanvas.tsx`**

```tsx
import { useCallback } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { customNodeTypes } from './nodes/index'
import type { SQLNodeData } from '@/types'

interface DiagramCanvasProps {
  nodes: Node<SQLNodeData>[]
  edges: Edge[]
}

export function DiagramCanvas({ nodes: initialNodes, edges: initialEdges }: DiagramCanvasProps) {
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  const onInit = useCallback(() => {}, [])

  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg-surface)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={customNodeTypes}
        onInit={onInit}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        attributionPosition="bottom-right"
      >
        <Controls />
        <MiniMap nodeStrokeWidth={3} zoomable pannable />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="var(--border)" />
      </ReactFlow>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/diagram/DiagramCanvas.tsx
git commit -m "feat(diagram): add DiagramCanvas with ReactFlow, Controls, MiniMap, Background"
```

---

## Task 11: QueryEditor + DialectSelector

**Files:**
- Create: `src/components/editor/QueryEditor.tsx`
- Create: `src/components/editor/DialectSelector.tsx`

- [ ] **Step 1: Create `src/components/editor/QueryEditor.tsx`**

```tsx
import { useRef } from 'react'
import type { Dialect } from '@/types'

interface QueryEditorProps {
  value: string
  onChange: (value: string) => void
  dialect: Dialect
  error?: string | null
}

export function QueryEditor({ value, onChange, error }: QueryEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="SQL query editor"
        spellCheck={false}
        placeholder="Enter your SQL query here..."
        style={{
          width: '100%',
          height: 200,
          resize: 'vertical',
          fontFamily: 'monospace',
          fontSize: 13,
          lineHeight: 1.6,
          padding: '10px 12px',
          background: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          border: `1px solid ${error ? '#E24B4A' : 'var(--border)'}`,
          borderRadius: 6,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      {error && (
        <p style={{ fontSize: 11, color: '#E24B4A', margin: 0 }} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/editor/DialectSelector.tsx`**

```tsx
import { Button } from '@/components/ui/button'
import type { Dialect } from '@/types'

const DIALECTS: Array<{ value: Dialect; label: string; color: string }> = [
  { value: 'postgresql', label: 'PostgreSQL', color: '#336791' },
  { value: 'mysql',      label: 'MySQL',      color: '#00758F' },
  { value: 'sqlserver',  label: 'SQL Server', color: '#CC2927' },
]

interface DialectSelectorProps {
  value: Dialect
  onChange: (dialect: Dialect) => void
}

export function DialectSelector({ value, onChange }: DialectSelectorProps) {
  return (
    <div style={{ display: 'flex', gap: 6 }} role="tablist" aria-label="SQL dialect selector">
      {DIALECTS.map((d) => (
        <Button
          key={d.value}
          variant={value === d.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(d.value)}
          role="tab"
          aria-selected={value === d.value}
          aria-label={`Select ${d.label} dialect`}
          style={value === d.value ? { borderColor: d.color, background: d.color, color: '#fff' } : {}}
        >
          {d.label}
        </Button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/
git commit -m "feat(editor): add QueryEditor textarea and DialectSelector tabs"
```

---

## Task 12: Header + AppShell

**Files:**
- Create: `src/components/layout/Header.tsx`
- Create: `src/components/layout/AppShell.tsx`

- [ ] **Step 1: Create `src/components/layout/Header.tsx`**

```tsx
import { Button } from '@/components/ui/button'
import type { AppMode } from '@/types'

const MODES: Array<{ value: AppMode; label: string }> = [
  { value: 'explain', label: 'Explain' },
  { value: 'diff',    label: 'Diff' },
  { value: 'stepper', label: 'Stepper' },
]

interface HeaderProps {
  mode: AppMode
  onModeChange: (mode: AppMode) => void
  theme: 'light' | 'dark'
  onThemeToggle: () => void
}

export function Header({ mode, onModeChange, theme, onThemeToggle }: HeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '10px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        flexShrink: 0,
      }}
    >
      <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent)', letterSpacing: -0.3 }}>
        Vali-ViewSql
      </span>

      <div style={{ display: 'flex', gap: 4, marginLeft: 16 }}>
        {MODES.map((m) => (
          <Button
            key={m.value}
            variant={mode === m.value ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onModeChange(m.value)}
            aria-label={`Switch to ${m.label} mode`}
          >
            {m.label}
          </Button>
        ))}
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onThemeToggle}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </Button>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Create `src/components/layout/AppShell.tsx`**

```tsx
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import type { ReactNode } from 'react'

interface AppShellProps {
  header: ReactNode
  leftPanel: ReactNode
  rightPanel: ReactNode
}

export function AppShell({ header, leftPanel, rightPanel }: AppShellProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {header}
      <ResizablePanelGroup direction="horizontal" style={{ flex: 1, overflow: 'hidden' }}>
        <ResizablePanel defaultSize={45} minSize={30}>
          <div style={{ height: '100%', overflow: 'auto', padding: 16 }}>
            {leftPanel}
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={55} minSize={30}>
          <div style={{ height: '100%', overflow: 'auto' }}>
            {rightPanel}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/
git commit -m "feat(layout): add Header with mode tabs + theme toggle, AppShell with ResizablePanelGroup"
```

---

## Task 13: useParseQuery hook

**Files:**
- Create: `src/hooks/useParseQuery.ts`

- [ ] **Step 1: Create `src/hooks/useParseQuery.ts`**

```typescript
import { useEffect, useCallback } from 'react'
import { parseSQLAsync } from '@/lib/parser/index'
import { useAppStore } from '@/store/useAppStore'

export function useParseQuery() {
  const query = useAppStore((s) => s.query)
  const dialect = useAppStore((s) => s.dialect)
  const setParseResult = useAppStore((s) => s.setParseResult)
  const setParseError = useAppStore((s) => s.setParseError)
  const setIsLoading = useAppStore((s) => s.setIsLoading)
  const addToHistory = useAppStore((s) => s.addToHistory)

  const runParse = useCallback(async () => {
    if (!query.trim()) {
      setParseResult(null)
      setParseError(null)
      return
    }

    setIsLoading(true)
    setParseError(null)

    try {
      const result = await parseSQLAsync(query, dialect)
      setParseResult(result)
      addToHistory(query, dialect)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Unknown parse error')
      setParseResult(null)
    } finally {
      setIsLoading(false)
    }
  }, [query, dialect, setParseResult, setParseError, setIsLoading, addToHistory])

  useEffect(() => {
    const timer = setTimeout(runParse, 800)
    return () => clearTimeout(timer)
  }, [runParse])
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useParseQuery.ts
git commit -m "feat(hooks): add useParseQuery with 800ms debounce and async parse"
```

---

## Task 14: App.tsx — integration + theme sync

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Replace `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 2: Replace `src/App.tsx`**

```tsx
import { useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { QueryEditor } from '@/components/editor/QueryEditor'
import { DialectSelector } from '@/components/editor/DialectSelector'
import { DiagramCanvas } from '@/components/diagram/DiagramCanvas'
import { useAppStore } from '@/store/useAppStore'
import { useParseQuery } from '@/hooks/useParseQuery'

export default function App() {
  const query = useAppStore((s) => s.query)
  const dialect = useAppStore((s) => s.dialect)
  const mode = useAppStore((s) => s.mode)
  const theme = useAppStore((s) => s.theme)
  const parseResult = useAppStore((s) => s.parseResult)
  const parseError = useAppStore((s) => s.parseError)

  const setQuery = useAppStore((s) => s.setQuery)
  const setDialect = useAppStore((s) => s.setDialect)
  const setMode = useAppStore((s) => s.setMode)
  const setTheme = useAppStore((s) => s.setTheme)

  // Sincroniza el tema con la clase del documento
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Activa el parsing reactivo con debounce
  useParseQuery()

  const leftPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <DialectSelector value={dialect} onChange={setDialect} />
      <QueryEditor value={query} onChange={setQuery} dialect={dialect} error={parseError} />
      <div style={{ flex: 1, minHeight: 300, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <DiagramCanvas
          nodes={parseResult?.nodes ?? []}
          edges={parseResult?.edges ?? []}
        />
      </div>
    </div>
  )

  const rightPanel = (
    <div style={{ padding: 16 }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
        {parseResult
          ? `${parseResult.nodes.length} nodes · ${parseResult.edges.length} edges · ${parseResult.glossary.length} glossary entries`
          : 'Enter a SQL query to see the diagram.'}
      </p>
      {parseResult?.glossary.map((g, i) => (
        <div key={i} style={{ marginBottom: 8, padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 6 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{g.keyword}</span>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 8 }}>{g.role}</span>
          <p style={{ fontSize: 11, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>{g.detail}</p>
        </div>
      ))}
    </div>
  )

  return (
    <AppShell
      header={
        <Header
          mode={mode}
          onModeChange={setMode}
          theme={theme}
          onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        />
      }
      leftPanel={leftPanel}
      rightPanel={rightPanel}
    />
  )
}
```

- [ ] **Step 3: Run dev server and verify the app works**

```bash
"C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run dev
```

Open `http://localhost:5173`. Paste this query and verify the diagram appears:

```sql
SELECT o.id, u.name, SUM(o.total) as total
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.created_at > '2024-01-01'
GROUP BY o.id, u.name
ORDER BY total DESC
LIMIT 10
```

Expected: diagram with nodes for `orders` table, `users` table, `INNER JOIN`, `WHERE`, `GROUP BY`, `SELECT`, `ORDER BY`, `LIMIT` connected by colored edges.

- [ ] **Step 4: Run all tests to confirm nothing broke**

```bash
"C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run test -- --reporter=verbose
```

Expected: all parser tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/main.tsx
git commit -m "feat: integrate App.tsx — query editor + dialect selector + diagram canvas + theme toggle working"
```

---

## Task 15: TypeScript strict check + lint pass

**Files:**
- Modify: `package.json` (add scripts)

- [ ] **Step 1: Add type-check and lint scripts to `package.json`**

In the `scripts` section, ensure:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx"
  }
}
```

- [ ] **Step 2: Run TypeScript strict check**

```bash
"C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run type-check
```

Expected: 0 errors. Fix any type errors that appear before proceeding.

- [ ] **Step 3: Run build**

```bash
"C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run build
```

Expected: build completes without errors. `dist/` folder created.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: verify batch 1 — type-check clean, build passing, all tests green"
```

---

## Self-review checklist

- [x] `dialectAdapter` tested for all 3 dialects
- [x] `autoLayout` tested: unique positions, level ordering, single node
- [x] `astToGraph` tested: SELECT, WHERE, JOIN, GROUP BY, ORDER BY, LIMIT, edges validity, deterministic IDs, glossary
- [x] `parseSQL` integration tested: error handling, empty input, multi-dialect
- [x] Web Worker created and dispatched for >5000 char queries
- [x] All 7 node types implemented and memoized
- [x] `NODE_COLORS` covers all 14 NodeTypes (future-proof for Batch 2)
- [x] Store persists: history, dialect, theme
- [x] Theme toggle syncs with `document.documentElement.classList`
- [x] App renders diagram from real SQL with debounce
- [x] TypeScript strict — no `any`, no `@ts-ignore`
- [x] Commits follow Conventional Commits
