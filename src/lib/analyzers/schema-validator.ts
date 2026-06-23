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
  if (Array.isArray(node)) { node.forEach(child => collectColumnRefs(child, refs)); return }
  for (const key of Object.keys(node)) {
    if (key !== 'type') collectColumnRefs(node[key], refs)
  }
}

type JoinCond = { leftTable: string; leftCol: string; rightTable: string; rightCol: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function walkJoins(node: any, joins: JoinCond[]): void {
  if (!node || typeof node !== 'object') return
  if (node.join && node.on?.type === 'binary_expr' && node.on.left?.type === 'column_ref' && node.on.right?.type === 'column_ref') {
    joins.push({
      leftTable:  (node.on.left.table  ?? '').toLowerCase(),
      leftCol:    (node.on.left.column  ?? '').toLowerCase(),
      rightTable: (node.on.right.table ?? '').toLowerCase(),
      rightCol:   (node.on.right.column ?? '').toLowerCase(),
    })
    return  // avoid re-entering the same join node's children
  }
  if (Array.isArray(node)) node.forEach(n => walkJoins(n, joins))
  else Object.values(node).forEach(n => walkJoins(n, joins))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildAliasMap(rawAst: any): Record<string, string> {
  const map: Record<string, string> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function walk(node: any) {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) { node.forEach(walk); return }
    if (node.table && node.as) map[node.as.toLowerCase()] = node.table.toLowerCase()
    Object.values(node).forEach(walk)
  }
  walk(rawAst)
  return map
}

function checkColumnExists(refs: { table: string; column: string }[], aliases: Record<string, string>, schema: Schema): Issue[] {
  const issues: Issue[] = []
  for (const ref of refs) {
    if (!ref.table) continue
    const tableName = aliases[ref.table] ?? ref.table
    const tableDef  = schema[tableName]
    if (!tableDef) continue
    if (!tableDef.columns.some(c => c.name === ref.column)) {
      issues.push({
        id:          `schema-col-missing-${tableName}-${ref.column}`,
        severity:    'error',
        title:       `Column '${ref.column}' not found in '${tableName}'`,
        description: `Column '${ref.column}' does not exist in table '${tableName}'. Check for typos or missing migrations.`,
        suggestion:  `Available columns: ${tableDef.columns.map(c => c.name).join(', ')}`,
      })
    }
  }
  return issues
}

function checkJoinIndexes(joinConds: JoinCond[], aliases: Record<string, string>, schema: Schema): Issue[] {
  const issues: Issue[] = []
  for (const { leftTable, leftCol, rightTable, rightCol } of joinConds) {
    for (const [tAlias, col] of [[leftTable, leftCol], [rightTable, rightCol]] as [string, string][]) {
      const tName   = aliases[tAlias] ?? tAlias
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

export function validateAgainstSchema(rawAst: unknown, schema: Schema | null): Issue[] {
  if (!schema || !rawAst) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ast     = rawAst as any
  const aliases = buildAliasMap(ast)
  const refs: { table: string; column: string }[] = []
  collectColumnRefs(ast, refs)
  const joinConds: JoinCond[] = []
  walkJoins(ast, joinConds)
  return [...checkColumnExists(refs, aliases, schema), ...checkJoinIndexes(joinConds, aliases, schema)]
}
