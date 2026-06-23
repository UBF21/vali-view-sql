import type { Schema, SchemaTable, SchemaColumn } from './types'

function normalizeName(name: string): string {
  return name.replace(/[`"[\]]/g, '').toLowerCase()
}

function splitBodyParts(body: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of body) {
    if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (ch === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

function collectTablePKs(parts: string[]): Set<string> {
  const pks = new Set<string>()
  for (const part of parts) {
    const pkMatch = part.match(/^PRIMARY\s+KEY\s*\(([^)]+)\)/i)
    if (pkMatch) {
      pkMatch[1].split(',').map(c => normalizeName(c.trim())).forEach(c => pks.add(c))
    }
  }
  return pks
}

function collectTableFKs(parts: string[]): Record<string, { table: string; column: string }> {
  const fkMap: Record<string, { table: string; column: string }> = {}
  for (const part of parts) {
    const fkMatch = part.match(
      /^(?:CONSTRAINT\s+\w+\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([`"[\]\w]+)\s*\(([^)]+)\)/i,
    )
    if (fkMatch) {
      const col   = normalizeName(fkMatch[1].trim())
      const table = normalizeName(fkMatch[2].trim())
      const ref   = normalizeName(fkMatch[3].trim())
      fkMap[col] = { table, column: ref }
    }
  }
  return fkMap
}

function parseColumn(
  part: string,
  tablePKs: Set<string>,
  tableFKs: Record<string, { table: string; column: string }>,
): SchemaColumn | null {
  if (/^(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|CONSTRAINT|INDEX)\b/i.test(part)) return null
  const colMatch = part.match(/^([`"[\]\w]+)\s+(\w[\w\s(,)]*?)(?:\s+(.*?))?$/i)
  if (!colMatch) return null
  const colName   = normalizeName(colMatch[1])
  const colType   = (colMatch[2]?.trim().split(/\s+/)[0]?.replace(/\(.*\)/, '') ?? '').toUpperCase()
  const rest      = (colMatch[3] ?? '').toUpperCase()
  const inlineRef = part.match(/REFERENCES\s+([`"[\]\w]+)\s*\(([^)]+)\)/i)
  return {
    name:         colName,
    type:         colType,
    nullable:     !rest.includes('NOT NULL') && !rest.includes('PRIMARY KEY'),
    isPrimaryKey: rest.includes('PRIMARY KEY') || tablePKs.has(colName),
    isForeignKey: !!inlineRef || !!tableFKs[colName],
    isIndexed:    rest.includes('PRIMARY KEY') || rest.includes('UNIQUE'),
    references:   inlineRef
      ? { table: normalizeName(inlineRef[1]), column: normalizeName(inlineRef[2].trim()) }
      : tableFKs[colName],
  }
}

function parseTableBlock(rawName: string, body: string): SchemaTable {
  const tableName = normalizeName(rawName)
  const parts     = splitBodyParts(body)
  const tablePKs  = collectTablePKs(parts)
  const tableFKs  = collectTableFKs(parts)
  const columns: SchemaColumn[] = []
  const indexes: string[] = []

  for (const part of parts) {
    const col = parseColumn(part, tablePKs, tableFKs)
    if (!col) continue
    if (col.isIndexed && !col.isPrimaryKey && !indexes.includes(col.name)) {
      indexes.push(col.name)
    }
    columns.push(col)
  }

  return { name: tableName, columns, indexes }
}

function applyCreateIndexes(ddl: string, schema: Schema): void {
  const indexStmts = ddl.matchAll(
    /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?\w+\s+ON\s+([`"[\]\w]+)\s*\(([^)]+)\)/gi,
  )
  for (const [, rawTable, rawCols] of indexStmts) {
    const tName = normalizeName(rawTable)
    if (!schema[tName]) continue
    rawCols.split(',').map(c => normalizeName(c.trim())).forEach(col => {
      if (!schema[tName].indexes.includes(col)) schema[tName].indexes.push(col)
      const colDef = schema[tName].columns.find(c => c.name === col)
      if (colDef) colDef.isIndexed = true
    })
  }
}

export function parseSchema(ddl: string): Schema {
  if (!ddl.trim()) return {}
  const schema: Schema = {}
  const tableBlocks = ddl.matchAll(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"[\]\w.]+)\s*\(([^;]+)\)/gi,
  )
  for (const [, rawName, body] of tableBlocks) {
    const table = parseTableBlock(rawName, body)
    schema[table.name] = table
  }
  applyCreateIndexes(ddl, schema)
  return schema
}
