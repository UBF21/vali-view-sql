import { Parser } from 'node-sql-parser'
import { dialectAdapter } from './dialect-adapter'
import { astToGraph } from './ast-to-graph'
import { autoLayout } from './layout'
import { isSP, parseSP } from './sp-parser'
import type { Dialect, ParseResult, SQLNodeData } from '@/types'
import type { Node } from '@xyflow/react'

const parser = new Parser()

const DB_MAP: Record<string, string> = {
  postgresql: 'PostgreSQL',
  mysql:      'MySQL',
  sqlserver:  'TransactSQL',
  sqlite:     'SQLite',
}

// Known constructs that can't be visualized — return friendly label
const UNSUPPORTED: Array<[RegExp, string]> = [
  [/\bMERGE\b/i,                     'MERGE statements are not yet visualized.'],
  [/\bPIVOT\b|\bUNPIVOT\b/i,        'PIVOT / UNPIVOT are not yet visualized.'],
  [/\bCROSS\s+APPLY\b|\bOUTER\s+APPLY\b/i, 'CROSS / OUTER APPLY are not yet visualized.'],
]

function friendlyLabel(sql: string): string | null {
  for (const [re, label] of UNSUPPORTED) {
    if (re.test(sql)) return label
  }
  return null
}

function buildUnsupportedResult(label: string): ParseResult {
  const node: Node<SQLNodeData> = {
    id: 'unsupported-0', type: 'outputNode', position: { x: 0, y: 0 },
    data: { nodeType: 'output', label, detail: 'This SQL construct is not supported by the visualizer yet.', clause: '', hasIssue: true },
  }
  return { nodes: [node], edges: [], glossary: [], rawAst: null }
}

function buildErrorResult(sql: string, err: unknown): ParseResult {
  const label = friendlyLabel(sql)
  if (label) return buildUnsupportedResult(label)
  const message = err instanceof Error ? err.message : 'Parse error'
  const node: Node<SQLNodeData> = {
    id: 'error-0', type: 'outputNode', position: { x: 0, y: 0 },
    data: { nodeType: 'output', label: 'Parse Error', detail: message.slice(0, 120), clause: sql.slice(0, 80), hasIssue: true },
  }
  return { nodes: [node], edges: [], glossary: [], rawAst: null }
}

// Try parsing multi-statement SQL (blank-line-separated scripts like SQL Server temp tables)
function tryMultiStatement(sql: string): unknown | null {
  const chunks = sql.split(/\n[ \t]*\n/).map(s => s.trim()).filter(Boolean)
  if (chunks.length < 2) return null
  try {
    return parser.astify(chunks.join(';\n'))
  } catch {
    // Fall back to first parseable individual statement
    for (const chunk of chunks) {
      try { return parser.astify(chunk) } catch { /* continue */ }
    }
    return null
  }
}

export function parseSQL(sql: string, dialect: Dialect): ParseResult {
  if (!sql.trim()) return { nodes: [], edges: [], glossary: [], rawAst: null }

  if (isSP(sql)) {
    const spResult = parseSP(sql, dialect)
    return { nodes: spResult.nodes, edges: spResult.edges, glossary: [], rawAst: null }
  }

  const normalizedSql = dialectAdapter(sql, dialect)

  const dbOption = { database: DB_MAP[dialect] ?? 'MySQL' }

  let ast: unknown
  try {
    ast = parser.astify(normalizedSql, dbOption)
  } catch (err) {
    const multiAst = tryMultiStatement(normalizedSql)
    if (multiAst) {
      ast = multiAst
    } else {
      return buildErrorResult(sql, err)
    }
  }

  const { nodes, edges, glossary } = astToGraph(ast, dialect)
  const positionedNodes = autoLayout(nodes, edges)
  return { nodes: positionedNodes, edges, glossary, rawAst: ast }
}

// ─── Web Worker dispatch ──────────────────────────────────────────────────────

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

  return new Promise((resolve, reject) => {
    const worker = getWorker()
    const onMessage = (e: MessageEvent<ParseResult>) => {
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
      resolve(e.data)
    }
    const onError = (e: ErrorEvent) => {
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
      reject(new Error(e.message || 'Worker error'))
    }
    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', onError)
    worker.postMessage({ sql, dialect })
  })
}
