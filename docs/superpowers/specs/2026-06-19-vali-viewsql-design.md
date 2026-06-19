# Vali-ViewSql — Design Document

**Fecha:** 2026-06-19  
**Estado:** Aprobado  
**Autor:** fmontenegro + Claude Code

---

## Visión

Replicar y superar [actuallyexplain.vercel.app](https://actuallyexplain.vercel.app/) con soporte multi-dialect (PostgreSQL, MySQL, SQL Server / T-SQL), CTEs, tablas temporales y Stored Procedures con flujo de control completo. Sin backend, sin IA. Todo el procesamiento ocurre en el cliente.

---

## Stack

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Vite + React | 19 (latest) |
| Lenguaje | TypeScript | 5.x strict |
| Estilos | Tailwind CSS | v4 |
| Componentes UI | shadcn/ui | latest (con Radix UI) |
| Diagrama | @xyflow/react (React Flow) | v12 |
| Parser SQL | node-sql-parser | v4 |
| Export PNG | html-to-image | latest |
| Animaciones | framer-motion | v11 |
| Estado global | Zustand | v5 |
| Testing | Vitest + Testing Library | latest |
| Linter | ESLint flat config + Prettier | latest |
| Deploy | Vercel | latest |

---

## Arquitectura general

App 100% client-side. Sin backend, sin IA.

```
SQL input
  → dialectAdapter()          normaliza diferencias de sintaxis por dialect
  → node-sql-parser.astify()  produce el AST
  → astToGraph()              AST → { nodes, edges, glossary }
  → autoLayout()              asigna posiciones x/y topológicamente
  → React Flow                renderiza el diagrama interactivo
        ↓
  runAnalyzers(ast, dialect)  → Issue[]
  generateSuggestions(...)    → Suggestion[]
```

- Estado global en **Zustand** con `persist` (historial + dialect en localStorage)
- URL sincronizada con `window.history.replaceState` — sin React Router
- Web Worker para queries >5000 caracteres (evitar freeze del UI)
- Parse con debounce de 800ms mientras el usuario escribe
- UI en **inglés**; comentarios de código en **español**

---

## Modos de la app

| Modo | Descripción |
|------|-------------|
| `explain` | Modo principal — editor + diagrama + panels |
| `diff` | Dos editores + dos diagramas side-by-side con colores de cambio |
| `stepper` | Diagrama con animación paso a paso del orden de ejecución SQL |

---

## NodeTypes — 14 tipos

### Tipos originales

| NodeType | Representa | Icon |
|----------|-----------|------|
| `table` | Tabla fuente | ⊞ |
| `join` | JOIN (INNER/LEFT/RIGHT/FULL/CROSS) | ⋈ |
| `filter` | WHERE / HAVING | ▽ |
| `aggregate` | GROUP BY + funciones de agregación | ∑ |
| `output` | SELECT final (proyección) | → |
| `sort` | ORDER BY | ↕ |
| `limit` | LIMIT / TOP / FETCH NEXT | # |
| `subquery` | Subquery colapsable con sub-grafo | ⊂ |
| `setop` | UNION / INTERSECT / EXCEPT | ∪ |

### Tipos nuevos

| NodeType | Representa | Icon | Color |
|----------|-----------|------|-------|
| `cte` | WITH clause (simple, recursivo o chain) | ⟳ | Violeta `#8B7CF8` |
| `temp_table` | #temp / TEMP TABLE (borde dashed) | ⊡ | Teal dashed `#5DCAA5` |
| `procedure` | SP container que envuelve el flujo interno | λ | Índigo `#6366F1` |
| `param` | Parámetro IN / OUT / INOUT del SP | →/← | `#818CF8` |
| `declare` | DECLARE @variable local | $ | `#A78BFA` |
| `condition` | IF / ELSE — forma diamante, dos ramas | ◇ | Naranja `#FB923C` |
| `loop` | WHILE / CURSOR — edge de retorno | ↺ | Rosa `#FB7185` |

### Paleta completa

```typescript
export const NODE_COLORS: Record<NodeType, {
  bg: string; border: string; text: string; icon: string; borderStyle?: string
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
```

---

## Parser pipeline expandido

### `dialectAdapter.ts` — normalización pre-parse

```typescript
// SQL Server
.replace(/\bTOP\s+(\d+)\b/gi, '')         // mover TOP a LIMIT equivalente
.replace(/WITH\s*\(\s*NOLOCK\s*\)/gi, '') // quitar table hints
.replace(/\[(\w+)\]/g, '$1')              // bracket identifiers → plain
.replace(/\bISNULL\b/gi, 'COALESCE')      // normalizar función
.replace(/#(\w+)/g, 'tmp_$1')             // #temp → tmp_temp (identificador válido)

// MySQL
.replace(/`(\w+)`/g, '"$1"')              // backticks → comillas dobles
```

### `astToGraph.ts` — mapeo AST → grafo

**SELECT estándar:**
- `ast.from[]` → nodos `table` / `temp_table` (detectado por prefijo `tmp_` post-adapter)
- `ast.join[]` → nodos `join`
- `ast.where` → nodo `filter`
- `ast.groupby[]` → nodo `aggregate`
- `ast.having` → nodo `filter` adicional
- `ast.columns[]` → nodo `output`
- `ast.orderby[]` → nodo `sort`
- `ast.limit` → nodo `limit`

**CTEs (`ast.with[]`):**
- Un nodo `cte` por cada CTE definido
- CTEs recursivos (`WITH RECURSIVE`): edge de self-loop en el nodo
- CTE chains: si CTE B referencia CTE A → edge `cte-A → cte-B` antes del grafo principal
- Edge especial: `stroke: '#8B7CF8', strokeDasharray: '6,4'`

**Subqueries:**
- Nodo `subquery` colapsable con sub-grafo interno guardado en `data.subGraph`
- Al click: expandir/colapsar con `NodeToolbar` de React Flow

**UNION / INTERSECT / EXCEPT:**
- Nodo `setop` que recibe las dos ramas

**Stored Procedures:**
- Nodo `procedure` como container visual (`bg: '#1A1A2E'`, border `#6366F1`)
- Usar React Flow **parent nodes** (`parentId` en cada hijo) para que los nodos internos queden anclados al container. El container tiene `style.width` y `style.height` calculados dinámicamente según el número de hijos.
- `param` nodes encima del container — uno por parámetro con dirección `IN`/`OUT`/`INOUT`
- Body parseado statement por statement:
  - `DECLARE @var` → nodo `declare`
  - `IF condition` → nodo `condition` (forma diamante via CSS `rotate(45deg)`) con dos edges etiquetados `true` / `false`
  - `WHILE condition` → nodo `loop` con edge de retorno al inicio (`type: 'bezier'` con alto curvature)
  - `SELECT/INSERT/UPDATE/DELETE` → sub-grafo normal (tabla + filtros + output)
- Todos los nodos hijos del SP tienen `parentId: procedureNodeId` y `extent: 'parent'`

### `autoLayout.ts` — posicionamiento topológico

Sin dagre. Algoritmo propio:

```
NODE_WIDTH  = 240px
NODE_HEIGHT = 90px (base; SubqueryNode y ProcedureNode son más altos)
H_GAP       = 60px
V_GAP       = 80px
```

1. Topological sort de nodos basado en edges
2. Asignar nivel (columna Y) a cada nodo
3. Nodos del mismo nivel van side-by-side centrados (columna X)
4. Nodos `table` / `cte` / `temp_table` siempre en nivel 0 (arriba)
5. Nodos `procedure` se posicionan como un bloque; sus hijos tienen offsets relativos

### IDs de nodos — deterministas

```typescript
// Formato: `${nodeType}-${index}`
// Garantiza que el diff funciona correctamente comparando IDs
const nodeId = `${nodeType}-${index}`
```

---

## Edge styles

```typescript
// Data flow normal
{ animated: false, style: { stroke: '#5F5E5A', strokeWidth: 1.5 } }

// JOIN merge
{ animated: true, style: { stroke: '#5DCAA5', strokeWidth: 1.5, strokeDasharray: '5,4' } }

// Filter (WHERE/HAVING)
{ animated: false, style: { stroke: '#EF9F27', strokeWidth: 1.5, strokeDasharray: '4,3' } }

// CTE
{ animated: false, style: { stroke: '#8B7CF8', strokeWidth: 1.5, strokeDasharray: '6,4' } }

// SP param → procedure
{ animated: false, style: { stroke: '#818CF8', strokeWidth: 1.5 } }

// condition true/false
{ label: 'true'/'false', style: { stroke: '#FB923C', strokeWidth: 1.5 } }

// loop back-edge
{ animated: true, style: { stroke: '#FB7185', strokeWidth: 1.5, strokeDasharray: '4,3' } }
```

---

## Analyzers

### `anti-patterns.ts`

| Anti-pattern | Detección en AST | Severidad |
|---|---|---|
| `SELECT *` | `ast.columns === '*'` o `expr.type === 'star'` | warning |
| Producto cartesiano | `ast.from.length > 1` sin `ast.join` | error |
| N+1 potencial | Subquery correlacionado en SELECT columns | warning |
| UPDATE sin WHERE | `ast.type === 'update'` && `!ast.where` | error |
| DELETE sin WHERE | `ast.type === 'delete'` && `!ast.where` | error |
| HAVING sin GROUP BY | `ast.having` && `!ast.groupby` | error |
| OR en JOIN condition | Edge condition contiene `OR` | warning |
| Función en WHERE col | `WHERE func(col) = val` | warning |
| LIKE con leading wildcard | `LIKE '%texto%'` | warning |
| DISTINCT con GROUP BY | Ambos presentes | info |

### `locks.ts` (SQL Server)

- `WITH (NOLOCK)` → info: "NOLOCK puede devolver dirty reads"
- `WITH (HOLDLOCK)` → warning: "HOLDLOCK puede causar deadlocks"

### `performance.ts`

- ORDER BY sin LIMIT en subquery → warning
- Múltiples subqueries no correlacionados → sugerir CTEs → info
- SP sin manejo de errores (sin TRY/CATCH) → warning

### `dialect-rules.ts`

| Dialect | Regla | Severidad |
|---|---|---|
| MySQL | FULL OUTER JOIN | error |
| MySQL | GROUP BY sin ONLY_FULL_GROUP_BY | warning |
| SQL Server | LIMIT detectado | error |
| SQL Server | ILIKE detectado | error |
| PostgreSQL | TOP detectado | error |

---

## Diff de queries

```
parseSQL(queryA) → { nodesA, edgesA }
parseSQL(queryB) → { nodesB, edgesB }
  → comparar IDs deterministas
  → addedNodes   = en B pero no en A  → borde verde
  → removedNodes = en A pero no en B  → borde rojo
  → changedNodes = mismo ID, distinto data.clause → borde amarillo
```

UI: dos `<ReactFlow>` side-by-side dentro de `<ResizablePanelGroup>`.

---

## Stepper — orden lógico de ejecución SQL

```
1. table / cte / temp_table (fuentes)
2. procedure params
3. declare
4. join
5. filter (WHERE)
6. aggregate (GROUP BY)
7. filter (HAVING)
8. condition (IF/ELSE)
9. loop (WHILE)
10. output (SELECT)
11. sort (ORDER BY)
12. limit
```

Cada step: nodo activo con `opacity: 1` + borde pulsante (framer-motion). Nodos anteriores: `opacity: 0.7`. Nodos siguientes: `opacity: 0.3`. Edges del step activo: `animated: true`.

Controles: `[⏮ Reset] [⏪ Prev]  Step 3 / 7: WHERE o.total > 100  [Next ⏩] [▶ Play]`

---

## Theme — Light / Dark toggle

Token CSS en `src/index.css`:

```css
:root {
  --bg-primary: #FFFFFF;
  --bg-surface: #F8F8F8;
  --bg-elevated: #F0F0F0;
  --border: rgba(0, 0, 0, 0.08);
  --text-primary: #111111;
  --text-secondary: #555555;
  --accent: #1D9E75;
}

.dark {
  --bg-primary: #0F0F0F;
  --bg-surface: #1A1A1A;
  --bg-elevated: #242424;
  --border: rgba(255, 255, 255, 0.08);
  --text-primary: #F5F5F5;
  --text-secondary: #888888;
  --accent: #5DCAA5;
}
```

Toggle en el header. Persistido en localStorage. Default: dark.

---

## Header

```
┌─────────────────────────────────────────────────────────────┐
│  Vali-ViewSql  │ [Explain] [Diff] [Stepper]  [🔗 Copy Link] [☀/🌙] │
└─────────────────────────────────────────────────────────────┘
```

- **Copy Link**: copia la URL actual (`?q=&d=&mode=`) al clipboard. Toast de confirmación "Link copied!".

---

## Layout general

```
┌──────────────────────────────────────────────────────────────┐
│  Header                                                       │
├──────────────────────────┬───────────────────────────────────┤
│  Panel izquierdo (45%)   │  Panel derecho (55%)              │
│  ┌──────────────────┐    │  Tabs:                            │
│  │ DialectSelector  │    │  [Glossary][Issues][Suggestions]  │
│  ├──────────────────┤    │                                   │
│  │ QueryEditor      │    │  <GlossaryPanel />                │
│  │ (textarea 200px) │    │  <IssuesPanel />                  │
│  ├──────────────────┤    │  <SuggestionsPanel />             │
│  │ [Examples▼][→]   │    │                                   │
│  └──────────────────┘    │                                   │
│                          │                                   │
│  DiagramCanvas           │                                   │
│  (React Flow, flex:1)    │                                   │
│  [Export PNG] [SVG]      │                                   │
└──────────────────────────┴───────────────────────────────────┘
```

`<ResizablePanelGroup>` de shadcn para el split ajustable. Mobile (<768px): stack vertical.

---

## Store Zustand

```typescript
interface AppStore {
  dialect: Dialect        // 'postgresql' | 'mysql' | 'sqlserver'
  query: string
  queryB: string          // para diff mode
  mode: AppMode           // 'explain' | 'diff' | 'stepper'
  theme: 'light' | 'dark'
  parseResult: ParseResult | null
  issues: Issue[]
  suggestions: Suggestion[]
  isLoading: boolean
  parseError: string | null
  history: Array<{ query: string; dialect: Dialect; timestamp: number }>
}
// persist: history + dialect + theme
```

---

## URL sharing

```
?q=<encoded_sql>&d=<dialect>&mode=<mode>
```

- Al montar: leer URL → popular store
- Al cambiar query/dialect/mode: `replaceState` sin reload
- Copy Link button: `navigator.clipboard.writeText(window.location.href)` + toast

---

## Ejemplos por dialect (mínimo 5 por dialect)

**PostgreSQL:** SELECT básico, LEFT JOIN múltiple, CTE recursivo, Window function, JSONB operators  
**MySQL:** GROUP_CONCAT, JOIN con LIMIT, Subquery correlacionado, INSERT...SELECT, FULL OUTER JOIN (trigger warning)  
**SQL Server:** SELECT TOP 10, CTE múltiple, WITH (NOLOCK), ROW_NUMBER() OVER, SP con IF/ELSE  

---

## Estructura de archivos

```
src/
├── main.tsx
├── App.tsx
├── index.css
├── store/
│   └── useAppStore.ts
├── lib/
│   ├── parser/
│   │   ├── index.ts            parseSQL(query, dialect) → ParseResult
│   │   ├── ast-to-graph.ts     AST → { nodes, edges, glossary }
│   │   ├── layout.ts           autoLayout sin dagre
│   │   └── dialect-adapter.ts  normalización pre-parse
│   ├── analyzers/
│   │   ├── index.ts            runAnalyzers(ast, dialect) → Issue[]
│   │   ├── anti-patterns.ts
│   │   ├── performance.ts
│   │   ├── locks.ts
│   │   └── dialect-rules.ts
│   ├── optimizer/
│   │   └── suggestions.ts
│   ├── diff/
│   │   └── query-diff.ts
│   ├── stepper/
│   │   └── execution-steps.ts
│   └── examples/
│       └── index.ts
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── Header.tsx          logo + mode tabs + Copy Link + theme toggle
│   │   └── PanelRight.tsx
│   ├── editor/
│   │   ├── QueryEditor.tsx
│   │   ├── DialectSelector.tsx
│   │   ├── ExamplePicker.tsx
│   │   └── DiffEditor.tsx
│   ├── diagram/
│   │   ├── DiagramCanvas.tsx
│   │   ├── ExportButton.tsx
│   │   ├── StepperControls.tsx
│   │   └── nodes/
│   │       ├── TableNode.tsx
│   │       ├── JoinNode.tsx
│   │       ├── FilterNode.tsx
│   │       ├── AggregateNode.tsx
│   │       ├── OutputNode.tsx
│   │       ├── SortNode.tsx
│   │       ├── LimitNode.tsx
│   │       ├── SubqueryNode.tsx
│   │       ├── SetopNode.tsx
│   │       ├── CteNode.tsx
│   │       ├── TempTableNode.tsx
│   │       ├── ProcedureNode.tsx
│   │       ├── ParamNode.tsx
│   │       ├── DeclareNode.tsx
│   │       ├── ConditionNode.tsx
│   │       └── LoopNode.tsx
│   ├── panels/
│   │   ├── GlossaryPanel.tsx
│   │   ├── IssuesPanel.tsx
│   │   ├── SuggestionsPanel.tsx
│   │   └── DiffPanel.tsx
│   └── ui/                     componentes shadcn (no editar)
├── hooks/
│   ├── useParseQuery.ts
│   ├── useStepAnimation.ts
│   ├── useExport.ts
│   └── useURLSync.ts
└── types/
    └── index.ts
```

---

## Tipos centrales (`src/types/index.ts`)

```typescript
export type Dialect = 'postgresql' | 'mysql' | 'sqlserver'

export type NodeType =
  | 'table' | 'join' | 'filter' | 'aggregate' | 'output'
  | 'sort' | 'limit' | 'subquery' | 'setop'
  | 'cte' | 'temp_table' | 'procedure' | 'param' | 'declare'
  | 'condition' | 'loop'

export type AppMode = 'explain' | 'diff' | 'stepper'

export interface SQLNodeData {
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
  // Para procedure
  subNodes?: Node<SQLNodeData>[]
  subEdges?: Edge[]
  // Para condition
  conditionBranch?: 'true' | 'false'
  // Para param
  paramDirection?: 'IN' | 'OUT' | 'INOUT'
  // Para subquery
  subGraph?: { nodes: Node<SQLNodeData>[]; edges: Edge[] }
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

export interface GlossaryEntry {
  keyword: string
  role: string
  detail: string
  lineRef?: number
}
```

---

## Reglas de calidad

- TypeScript strict: sin `any`, sin `@ts-ignore`
- Máximo 200 líneas por archivo — extraer helpers a `lib/`
- Nodos React Flow memoizados con `React.memo`
- IDs de nodos deterministas: `${nodeType}-${index}`
- `node-sql-parser` siempre en try/catch
- Sin `console.log` en producción — usar `import.meta.env.DEV`
- Todos los botones con `aria-label`
- Sin comentarios que expliquen el QUÉ — solo el POR QUÉ cuando no es obvio
- Commits en Conventional Commits: `feat/fix/refactor/chore/test`

---

## Batches de implementación

### Batch 1 — Foundation
- Scaffold: Vite + React 19 + TS strict + Tailwind v4 + shadcn + React Flow + Zustand
- `lib/parser/`: `dialectAdapter`, `astToGraph` (SELECT básico + JOINs), `autoLayout`
- Nodos: `table`, `join`, `filter`, `aggregate`, `output`, `sort`, `limit`
- `DiagramCanvas` + `QueryEditor` + `DialectSelector`
- `useAppStore` base + `useParseQuery` hook
- Web Worker para queries >5000 chars (evitar freeze del UI)
- **Tests:** `parseSQL` con fixtures de los 3 dialects — SELECT + JOINs + WHERE + GROUP BY

### Batch 2 — Extended Parser
- CTEs simples, recursivos y chains
- Subqueries colapsables + UNION/INTERSECT/EXCEPT
- Temp tables (los 3 dialects)
- Stored Procedures: params, DECLARE, IF/ELSE, WHILE
- Nodos: `cte`, `temp_table`, `procedure`, `param`, `declare`, `condition`, `loop`, `subquery`, `setop`
- **Tests:** fixtures SP completo + CTE recursivo + temp table por dialect

### Batch 3 — Analysis panels
- `lib/analyzers/`: anti-patterns, performance, locks, dialect-rules
- `lib/optimizer/suggestions.ts`
- `GlossaryPanel` + `IssuesPanel` + `SuggestionsPanel`
- Decorar nodos con `hasIssue`
- Panel derecho completo con tabs
- **Tests:** cada anti-pattern con fixture SQL

### Batch 4 — Diff mode
- `lib/diff/query-diff.ts`
- `DiffEditor` + `DiffPanel`
- Dos ReactFlow side-by-side con `<ResizablePanelGroup>`
- Colores: removed=rojo, added=verde, changed=amarillo
- **Tests:** `diffQueries` con pares de queries representativos

### Batch 5 — Stepper
- `lib/stepper/execution-steps.ts`
- `useStepAnimation` hook
- `StepperControls` (Play/Pause/Prev/Next/Reset)
- Animación framer-motion por nodo activo
- Panel derecho muestra descripción del step activo
- **Tests:** `buildSteps` con mocks + hook con timer mocks

### Batch 6 — Polish & Ship
- Export PNG + SVG (`html-to-image`)
- Light/Dark theme toggle
- Copy Link button + toast
- `ExamplePicker` (5+ queries por dialect, incluyendo SP y CTEs)
- URL sync (`?q=&d=&mode=`)
- Historial en localStorage (últimos 10)
- Responsive 375px
- `vite build` sin errores
- Deploy Vercel
- **Tests:** E2E básicos (Vitest + browser mode)

---

## Checklist "done"

- [ ] Parse correcto de 5 ejemplos por dialect sin errores
- [ ] CTEs simples, recursivos y chains visualizados correctamente
- [ ] Temp tables diferenciadas visualmente (borde dashed)
- [ ] SP con params, declare, IF/ELSE, WHILE renderizado como container
- [ ] Diagrama interactivo: drag nodos, zoom, pan
- [ ] Export PNG y SVG funcional
- [ ] Al menos 10 anti-patterns detectados correctamente
- [ ] Diff funciona entre dos queries con diferencias
- [ ] Stepper reproduce el flujo lógico en orden correcto
- [ ] Light/dark toggle persistido en localStorage
- [ ] Copy Link copia URL y muestra toast
- [ ] URL sharing: `?q=...&d=mysql` carga el estado correcto
- [ ] Historial persiste en localStorage (últimos 10)
- [ ] Responsive en 375px
- [ ] ESLint sin warnings
- [ ] `vite build` sin errores
- [ ] Deploy en Vercel
