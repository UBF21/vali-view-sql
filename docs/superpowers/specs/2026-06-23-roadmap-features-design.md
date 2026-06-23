# Roadmap Features — Design Spec

**Date:** 2026-06-23  
**Branch base:** main

---

## Goal

Extend vali-viewsql with 10 new features grouped in 3 tiers. The tiers reflect dependency order and implementation risk — Tier 1 features are independent and can be built in parallel; Tier 2 depends on a stable parser and some Tier 1 outputs; Tier 3 depends on Tier 1 + 2 being complete.

---

## Tier Map & Dependencies

```
Tier 1 (parallel):  #6 formatter · #7 complexity · #8 sqlite · #2 auto-apply
                              ↓              ↓
Tier 2 (some parallel): #1 merge/pivot · #4 lineage · #10 collections · #5 cross-dialect (after #8)
                              ↓              ↓
Tier 3 (sequential):    #3 schema-aware (after stable parser) · #9 export report (after #4 + #7)
```

---

## Feature 1 — MERGE / PIVOT / UNPIVOT Support

### Purpose
These three constructs currently show a friendly "not supported" error. Adding them eliminates the most common parser gap for SQL Server and advanced PostgreSQL users.

### New Node Types
| Construct | Node type | Visual |
|-----------|-----------|--------|
| MERGE | `MERGE` | Two input arrows (source + target) → action branches |
| PIVOT | `PIVOT` | Single input → rotated aggregation → output columns |
| UNPIVOT | `UNPIVOT` | Inverse of PIVOT |

### Implementation Approach
- **`dialect-adapter.ts`:** Normalize MERGE/PIVOT/UNPIVOT syntax across dialects before passing to node-sql-parser. SQL Server uses `MERGE INTO ... USING ... ON ... WHEN MATCHED THEN ...`; PostgreSQL uses `MERGE INTO ... USING ... ON ... WHEN MATCHED THEN ...` (SQL:2003 standard, supported in PG 15+).
- **`ast-to-graph.ts`:** New AST visitor branches for MERGE, PIVOT, UNPIVOT statement types.
- **`src/types/index.ts`:** Add `'MERGE' | 'PIVOT' | 'UNPIVOT'` to `NodeType` union.
- **`src/components/diagram/nodes/`:** Add `MergeNode.tsx`, `PivotNode.tsx`, `UnpivotNode.tsx` following the `BaseNode` pattern.
- **`nodes/index.ts`:** Register new node types in `NODE_COLORS` and `customNodeTypes`.
- **`execution-steps.ts`:** MERGE executes after source/target table read, before OUTPUT. PIVOT/UNPIVOT after AGGREGATE.

### MERGE node specifics
MERGE has two logical branches from the ON condition:
- `WHEN MATCHED THEN` → UPDATE or DELETE branch
- `WHEN NOT MATCHED THEN` → INSERT branch

Each branch becomes a `FILTER` node child with label "Matched" / "Not Matched".

### Acceptance Criteria
- [ ] MERGE query parses and renders without error
- [ ] PIVOT query shows rotated aggregation node
- [ ] UNPIVOT query shows inverse node
- [ ] All three appear correctly in Stepper execution order
- [ ] All three render in Diff mode (added/removed/changed coloring)

---

## Feature 2 — Auto-Apply Suggestions

### Purpose
The Suggestions panel shows what to change but requires manual edits. Adding "Apply" eliminates friction for the most common rewrite patterns.

### Rewriter Functions
Each suggestion type maps to a pure function `(sql: string) => string`:

| Suggestion key | Rewrite action |
|---------------|----------------|
| `replace_select_star` | Replace `SELECT *` with `SELECT -- specify columns` placeholder comment |
| `extract_subquery_cte` | Move first repeated subquery into a `WITH cte_name AS (...)` prefix |
| `replace_cross_join` | Replace `FROM a, b WHERE a.id = b.aid` with `FROM a INNER JOIN b ON a.id = b.aid` |
| `replace_leading_wildcard` | Replace `LIKE '%term'` with `-- consider full-text search: MATCH(col) AGAINST ('term')` |
| `replace_nolock` | Remove `WITH(NOLOCK)` hints |

Rewrites that require semantic knowledge (column names) insert a `-- TODO:` comment instead of guessing.

### UI Changes
- **`SuggestionsPanel.tsx`:** Add `<button>Apply</button>` per suggestion row (only for rewritable types).
- On click: call rewriter → update `query` in Zustand store → show toast "Suggestion applied".
- Toast also shows "Undo" which restores the previous query (single-level undo via store snapshot).

### Files
- Create: `src/lib/optimizer/rewriter.ts` — pure rewrite functions
- Modify: `src/components/panels/SuggestionsPanel.tsx`
- Modify: `src/store/useAppStore.ts` — add `previousQuery` field + `undoRewrite()` action

### Acceptance Criteria
- [ ] "Apply" button visible only on supported suggestion types
- [ ] Query updates in editor after apply
- [ ] Toast appears with Undo option
- [ ] Undo restores previous query
- [ ] Non-rewritable suggestions have no Apply button

---

## Feature 3 — Schema-Aware Mode

### Purpose
Allow users to paste their table schema (DDL or JSON) so the analyzer can validate column references, detect missing indexes, and catch type mismatches — turning vali-viewsql from a visualizer into a real validator.

### Schema Input Formats
1. **SQL DDL:** one or more `CREATE TABLE` statements pasted by the user
2. **JSON:** `{ tableName: { colName: { type, nullable, indexed } }[] }`

### Schema Parser (`src/lib/schema/schema-parser.ts`)
Extracts from DDL:
- Table names
- Column names + data types
- NOT NULL constraints
- PRIMARY KEY, UNIQUE, INDEX declarations
- FOREIGN KEY references

Output type:
```ts
interface SchemaTable {
  name: string
  columns: SchemaColumn[]
  indexes: string[]  // column names with indexes
}
interface SchemaColumn {
  name: string
  type: string
  nullable: boolean
  isPrimaryKey: boolean
  isForeignKey: boolean
  references?: { table: string; column: string }
}
type Schema = Record<string, SchemaTable>  // keyed by table name (lowercase)
```

### New Analyzer (`src/lib/analyzers/schema-validator.ts`)
Runs only when schema is loaded. Produces `Issue[]` items:

| Check | Severity | Example |
|-------|----------|---------|
| Column not in schema | error | `SELECT foo.bar` where `bar` doesn't exist in `foo` |
| Join on non-indexed column | warning | `ON a.user_id = b.user_id` where neither has index |
| Type mismatch in WHERE | warning | `WHERE status = 1` but `status` is `VARCHAR` |
| FK join not using FK column | info | JOIN condition doesn't match declared FK |

### UI
- New "Schema" tab in `PanelRight` (4th tab after Glossary / Issues / Suggestions).
- Tab content: textarea for DDL/JSON input + "Load Schema" button + loaded table list summary.
- Schema stored in Zustand as `schema: Schema | null` — not persisted.
- When schema is loaded, Issues panel shows schema-validation errors in addition to existing analysis.

### Files
- Create: `src/lib/schema/schema-parser.ts`
- Create: `src/lib/analyzers/schema-validator.ts`
- Modify: `src/lib/analyzers/index.ts` — run schema-validator when schema != null
- Modify: `src/store/useAppStore.ts` — add `schema` + `setSchema()` action
- Modify: `src/components/layout/PanelRight.tsx` — add Schema tab
- Create: `src/components/panels/SchemaPanel.tsx`

### Acceptance Criteria
- [ ] User can paste DDL and click "Load Schema"
- [ ] Table/column summary shown after load
- [ ] Issues panel shows schema errors when a column doesn't exist
- [ ] Missing index warnings appear on join columns
- [ ] Clearing schema removes schema-validation issues

---

## Feature 4 — Column Lineage

### Purpose
Show where each output column comes from — which table, through which joins and expressions. Today the diagram shows table/operation flow; this adds column-level traceability.

### Data Model
```ts
interface ColumnSource {
  table: string
  column: string  // '*' if SELECT *
  alias?: string
}
interface ColumnLineageEntry {
  outputAlias: string       // name in SELECT output
  expression?: string       // if computed: SUM(o.amount), CONCAT(...)
  sources: ColumnSource[]   // one for direct refs, many for expressions
}
type ColumnLineage = ColumnLineageEntry[]
```

### Extraction (`src/lib/lineage/column-lineage.ts`)
Walk the SELECT clause of the parsed AST:
- Direct column ref `t.col` → `{ table: t, column: col }`
- Alias `t.col AS alias` → `outputAlias: alias, sources: [{ table: t, column: col }]`
- Expression `SUM(o.amount)` → `expression: 'SUM(o.amount)', sources: [{ table: o, column: amount }]`
- `SELECT *` → one entry per table in FROM with `column: '*'`
- Subquery columns → source is the subquery alias

### UI
- New "Lineage" tab in `PanelRight` (5th tab).
- Shows a table: `Output column | Expression | Sources`
- Clicking a row highlights the relevant table nodes in the diagram (add `highlighted` CSS class).
- Diagram OUTPUT node gets a small "⋯" expand button; clicking opens lineage for that node's columns.

### Files
- Create: `src/lib/lineage/column-lineage.ts`
- Modify: `src/store/useAppStore.ts` — add `columnLineage: ColumnLineage` computed from parseResult
- Create: `src/components/panels/LineagePanel.tsx`
- Modify: `src/components/layout/PanelRight.tsx` — add Lineage tab
- Modify: `src/components/diagram/nodes/OutputNode.tsx` — add expand button

### Acceptance Criteria
- [ ] Lineage tab shows one row per SELECT column
- [ ] Direct refs show correct table + column
- [ ] Aliases resolved correctly
- [ ] Expressions show formula + source columns
- [ ] Clicking a row highlights source table nodes
- [ ] SELECT * shows all tables as sources

---

## Feature 5 — Cross-Dialect Conversion

### Purpose
Convert a query written in one dialect to another automatically — e.g., a PostgreSQL query to SQL Server syntax.

### Conversion Rules (`src/lib/converter/dialect-converter.ts`)
Each rule is `{ match: RegExp | string, replace: string | fn, note: string }`.

| From → To | Transformation |
|-----------|---------------|
| PG → SQL Server | `LIMIT n` → `TOP n` (prepended to SELECT list); `LIMIT n OFFSET m` → `OFFSET m ROWS FETCH NEXT n ROWS ONLY` |
| PG → SQL Server | `::type` cast → `CAST(expr AS type)` |
| PG → SQL Server | `ILIKE` → `LIKE` + note about collation |
| PG → SQL Server | `SERIAL` → `INT IDENTITY(1,1)` |
| PG → MySQL | `ILIKE` → `LIKE` (MySQL case-insensitive by default) |
| PG → MySQL | `"quoted_identifier"` → `` `backtick_identifier` `` |
| MySQL → PG | `` `backtick` `` → `"double_quote"` |
| MySQL → PG | `LIMIT x, y` → `LIMIT y OFFSET x` |
| MySQL → SQL Server | `` `backtick` `` → `[bracket]` |
| MySQL → SQL Server | `LIMIT n` → `TOP n` (move to SELECT clause) |
| SQL Server → PG | `TOP n` → `LIMIT n` (move to end) |
| SQL Server → PG | `[bracket]` → `"double_quote"` |
| SQL Server → PG | `WITH(NOLOCK)` → remove |
| SQL Server → MySQL | `[bracket]` → `` `backtick` `` |

Conversion produces: `{ convertedSQL: string, changes: ConversionChange[] }` where each `ConversionChange` has `{ rule, original, replaced }`.

### UI
- Add "Convert to →" dropdown button in the dialect selector area.
- On click: show converted SQL in a modal with "Use this query" / "Cancel" buttons.
- Modal shows a diff (original vs converted) with change annotations.
- "Use this query" sets editor query + switches dialect.

### Files
- Create: `src/lib/converter/dialect-converter.ts`
- Create: `src/components/editor/ConversionModal.tsx`
- Modify: `src/components/editor/DialectSelector.tsx` — add "Convert to" trigger

### Acceptance Criteria
- [ ] Convert button appears when dialect is selected
- [ ] Modal shows converted SQL with diff
- [ ] Changes list explains each transformation
- [ ] "Use this query" updates editor and switches dialect
- [ ] Untranslatable constructs show a warning note

---

## Feature 6 — Query Formatter / Beautifier

### Purpose
Format poorly written SQL (all on one line, inconsistent casing, no indentation) into clean, readable SQL.

### Library
Use **`sql-formatter`** npm package (supports all three existing dialects + SQLite). It handles keyword uppercasing, indentation, line breaks, and comment preservation.

```ts
import { format } from 'sql-formatter'
format(sql, { language: 'postgresql', keywordCase: 'upper', indentStyle: 'standard' })
```

Dialect mapping: `postgresql → 'postgresql'`, `mysql → 'mysql'`, `sqlserver → 'tsql'`, `sqlite → 'sqlite'`.

### UI
- Add "Format" button (icon: `AlignLeft` from lucide) in the editor toolbar area next to ExamplePicker.
- Keyboard shortcut: `Shift+Alt+F`.
- In-place replacement in the editor textarea.
- Toast: "Query formatted".

### Files
- Install: `sql-formatter`
- Modify: `src/components/editor/QueryEditor.tsx` — add Format button + shortcut handler
- No new files needed

### Acceptance Criteria
- [ ] Format button visible in editor toolbar
- [ ] Click formats and replaces query in editor
- [ ] Shift+Alt+F triggers format
- [ ] Comments preserved after format
- [ ] Dialect-aware formatting (TSQL for SQL Server)

---

## Feature 7 — Complexity Score

### Purpose
Give a visual complexity rating for a query so users can immediately see how hard a query is to reason about, optimize, or maintain.

### Scoring Algorithm (`src/lib/complexity/complexity-score.ts`)
```ts
function computeComplexity(parseResult: ParseResult): ComplexityResult {
  let score = 0
  score += tableCount                  // each table: +1
  score += joinCount * 1               // each JOIN: +1
  score += subqueryCount * 2           // each subquery: +2
  score += cteCount * 1                // each CTE: +1
  score += setOpCount * 1              // each UNION/INTERSECT/EXCEPT: +1
  score += nestingDepth * 2            // each nesting level beyond 1: +2
  score += windowFnCount * 1           // each window function: +1
  score += caseWhenCount * 0.5         // each CASE WHEN: +0.5
  score += hasProcedure ? 3 : 0        // stored procedure: +3

  const level =
    score <= 3  ? 'Simple' :
    score <= 7  ? 'Moderate' :
    score <= 12 ? 'Complex' : 'Very Complex'

  return { score: Math.round(score), level, breakdown: { tableCount, joinCount, ... } }
}
```

### UI
- Badge in `DiagramCanvas.tsx` top-left corner (absolute positioned, above the zoom controls).
- Color: green (Simple) / yellow (Moderate) / orange (Complex) / red (Very Complex).
- Click: popover/tooltip with breakdown table.

```
┌─────────────────────────────┐
│ 🔴 Very Complex  Score: 14  │
│ ─────────────────────────── │
│ Tables       3    +3        │
│ JOINs        4    +4        │
│ Subqueries   2    +4        │
│ CTEs         1    +1        │
│ Nesting      1    +2        │
└─────────────────────────────┘
```

### Files
- Create: `src/lib/complexity/complexity-score.ts`
- Modify: `src/store/useAppStore.ts` — add `complexityResult` derived from parseResult
- Modify: `src/components/diagram/DiagramCanvas.tsx` — add complexity badge overlay

### Acceptance Criteria
- [ ] Badge visible on diagram for any valid parse result
- [ ] Score matches formula (tested in unit tests)
- [ ] Color changes per level
- [ ] Breakdown popover shows correct per-category values
- [ ] Hidden when parse error

---

## Feature 8 — SQLite Dialect

### Purpose
Add SQLite as a fourth dialect. It is the most widely used embedded/dev SQL engine, commonly used in mobile apps, local dev, and testing.

### Type Changes
- `src/types/index.ts`: Add `'sqlite'` to `Dialect` union.

### Dialect Adapter (`src/lib/parser/dialect-adapter.ts`)
SQLite-specific normalizations:
- Remove `AUTOINCREMENT` (parser may not handle it — strip and note)
- `INTEGER PRIMARY KEY` treated as rowid alias
- No `RIGHT JOIN` / `FULL OUTER JOIN` support → pass through (will be caught by analyzer)
- Double-quoted strings are identifiers (not string literals)
- `||` string concatenation operator
- SQLite type affinity: `TEXT`, `NUMERIC`, `INTEGER`, `REAL`, `BLOB`

### New Analyzer Rules (`src/lib/analyzers/dialect-rules.ts`)
SQLite-specific rules added to the existing dialect-rules analyzer:
- `FULL OUTER JOIN` not supported → error
- `RIGHT JOIN` not supported → warning (rewrite as LEFT JOIN)
- Stored procedures not supported → error
- `TRUNCATE TABLE` not supported → error (use `DELETE FROM`)

### UI
- Add "SQLite" tab to `DialectSelector.tsx` (4th tab).
- Add SQLite examples to `src/lib/examples/index.ts` (minimum 3: basic select, join, CTE).

### node-sql-parser mapping
node-sql-parser uses `'SQLite'` as the database option. Update parser calls accordingly.

### Files
- Modify: `src/types/index.ts`
- Modify: `src/lib/parser/dialect-adapter.ts`
- Modify: `src/lib/analyzers/dialect-rules.ts`
- Modify: `src/lib/examples/index.ts`
- Modify: `src/components/editor/DialectSelector.tsx`
- Modify: `src/lib/parser/index.ts` — add SQLite to parser options map

### Acceptance Criteria
- [ ] SQLite tab appears in dialect selector
- [ ] Basic SQLite query parses and renders
- [ ] FULL OUTER JOIN shows error in Issues panel
- [ ] RIGHT JOIN shows warning
- [ ] SQLite examples available in ExamplePicker

---

## Feature 9 — Export Analysis Report

### Purpose
Generate a shareable HTML report (printable to PDF) with the full analysis of a query: diagram, issues, suggestions, column lineage, and complexity score.

### Report Structure (HTML)
```
1. Header: query name (auto: first table + operation), date, dialect, complexity badge
2. SQL code block (formatted, syntax-highlighted)
3. Diagram screenshot (html-to-image, same as PNG export)
4. Complexity breakdown table
5. Issues list (grouped by severity: error → warning → info)
6. Optimization suggestions (with before/after if auto-apply rules exist)
7. Column lineage table (if lineage computed)
8. Schema validation results (if schema loaded)
```

### Implementation
- Generate HTML string in `src/lib/report/report-generator.ts`
- Open in new browser tab via `window.open` + `document.write`
- Include inline CSS (print-friendly, light theme, no external deps)
- Diagram screenshot: reuse `useExport` hook logic
- User prints via browser Ctrl+P → PDF

### UI
- Add "Export Report" button in the diagram toolbar (next to Export PNG/SVG).
- Icon: `FileText` from lucide.

### Files
- Create: `src/lib/report/report-generator.ts`
- Modify: `src/hooks/useExport.ts` — expose `exportReport()` function
- Modify: `src/components/diagram/ExportButton.tsx` — add Report option

### Acceptance Criteria
- [ ] Report button opens new tab with formatted HTML
- [ ] Diagram screenshot included
- [ ] Issues, suggestions, lineage sections appear when data available
- [ ] Print layout clean (no UI chrome)
- [ ] Empty sections hidden (not shown as "No issues")

---

## Feature 10 — Query Collections / Bookmarks

### Purpose
Replace the current 10-query unnamed history with a full collections system: named saves, tags, descriptions, and import/export.

### Data Model
```ts
interface SavedQuery {
  id: string          // uuid
  name: string
  description?: string
  sql: string
  dialect: Dialect
  tags: string[]
  savedAt: string     // ISO date
}

interface Collection {
  id: string
  name: string
  color?: string      // hex, for visual distinction
  createdAt: string
  queries: SavedQuery[]
}
```

### Migration
- On first load with the new code, existing `history` array is migrated into a "Recent" default collection.
- Old `history` key removed from localStorage after migration.

### Storage
- Zustand persist: `collections: Collection[]` replaces `history: string[]`.
- Limits: max 20 collections, max 200 total saved queries.

### UI
- **HistoryPicker** renamed to **CollectionPicker** (dropdown stays in editor toolbar).
- Dropdown shows: collection list → expand each → query list.
- "Save current query" button opens a mini-form: name (required), description (optional), tags (optional), collection selector.
- Create/rename/delete collections via context menu in the dropdown.
- "Export" button: downloads `collections.json`.
- "Import" button: file picker, merges into existing collections.
- Search input at top of dropdown: filter queries by name/tags across all collections.

### Files
- Modify: `src/store/useAppStore.ts` — replace `history` with `collections` + migration logic
- Modify/Rename: `src/components/editor/HistoryPicker.tsx` → `CollectionPicker.tsx`
- Create: `src/components/editor/SaveQueryForm.tsx`

### Acceptance Criteria
- [ ] Existing history migrated to "Recent" collection on upgrade
- [ ] User can save current query with name + collection
- [ ] Collections can be created, renamed, deleted
- [ ] Search filters queries across all collections
- [ ] Export downloads valid JSON
- [ ] Import merges without duplicates (by id)
- [ ] Max limits enforced with user-facing message

---

## Cross-Cutting Concerns

### Testing
Every feature must include:
- Unit tests for pure logic (parsers, analyzers, scoring, rewriters, converters)
- Component tests for new UI panels/modals
- Integration test for the full parse → feature pipeline where applicable

### TypeScript
- All new types exported from `src/types/index.ts` or co-located in the feature's `lib/` folder.
- No `any` types.

### Performance
- Complexity score, lineage extraction, schema validation: run synchronously after parse since they're O(n) on the AST.
- Cross-dialect conversion: synchronous, runs only on explicit user action.
- Report generation: async (diagram screenshot is async via html-to-image).

### Accessibility
- All new buttons have `aria-label`.
- New tabs follow existing Radix UI tab pattern.
- New modals trap focus and close on Escape.
