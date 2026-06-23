export interface ColumnSource {
  table:  string
  column: string
}

export interface ColumnLineageEntry {
  outputAlias: string
  expression?: string
  sources:     ColumnSource[]
}

export type ColumnLineage = ColumnLineageEntry[]

interface ResolveResult {
  sources:       ColumnSource[]
  expressionStr?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Expr = any

function resolveColumnRef(expr: Expr): ResolveResult {
  return {
    sources: [{
      table:  expr.table ?? '',
      column: typeof expr.column === 'string' ? expr.column : String(expr.column ?? '*'),
    }],
  }
}

function resolveStar(expr: Expr): ResolveResult {
  return { sources: [{ table: expr.table ?? '*', column: '*' }] }
}

function resolveAggrOrFunc(expr: Expr): ResolveResult {
  const name    = expr.name ?? expr.type
  const argList = expr.args?.value ?? expr.args ?? []
  const args    = Array.isArray(argList) ? argList : [argList]

  const sources: ColumnSource[] = []
  for (const arg of args) {
    sources.push(...resolveExpr(arg).sources)
  }

  const argStr = sources
    .map(s => [s.table, s.column].filter(Boolean).join('.'))
    .join(', ')

  return { sources, expressionStr: `${name}(${argStr})` }
}

function resolveBinaryExpr(expr: Expr): ResolveResult {
  const left  = resolveExpr(expr.left)
  const right = resolveExpr(expr.right)
  return { sources: [...left.sources, ...right.sources] }
}

function resolveExpr(expr: Expr): ResolveResult {
  if (!expr)                                         return { sources: [] }
  if (expr.type === 'column_ref')                    return resolveColumnRef(expr)
  if (expr.type === 'star' || expr.column === '*')   return resolveStar(expr)
  if (expr.type === 'aggr_func' || expr.type === 'function') return resolveAggrOrFunc(expr)
  if (expr.type === 'binary_expr')                   return resolveBinaryExpr(expr)
  return { sources: [] }
}

function deriveAlias(alias: string | null, sources: ColumnSource[], expressionStr?: string): string {
  if (alias)                         return alias
  if (sources[0]?.column !== '*')    return sources[0]?.column ?? 'expr'
  if (expressionStr)                 return expressionStr.split('(')[0]
  return 'expr'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapColumn(col: any): ColumnLineageEntry {
  const { sources, expressionStr } = resolveExpr(col.expr)
  const outputAlias = deriveAlias(col.as ?? null, sources, expressionStr)
  const entry: ColumnLineageEntry = { outputAlias, sources }
  if (expressionStr) entry.expression = expressionStr
  return entry
}

export function extractColumnLineage(rawAst: unknown): ColumnLineage {
  if (!rawAst) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stmts: any[] = Array.isArray(rawAst) ? rawAst : [rawAst]
  const stmt = stmts[0]

  if (!stmt || stmt.type !== 'select') return []

  const { columns } = stmt
  if (!columns || columns === '*') {
    return [{ outputAlias: '*', sources: [{ table: '*', column: '*' }] }]
  }

  return (Array.isArray(columns) ? columns : []).map(mapColumn)
}
