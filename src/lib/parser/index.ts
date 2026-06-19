import { Parser } from 'node-sql-parser'
import { dialectAdapter } from './dialect-adapter'
import { astToGraph } from './ast-to-graph'
import { autoLayout } from './layout'
import { isSP, parseSP } from './sp-parser'
import type { Dialect, ParseResult, SQLNodeData } from '@/types'
import type { Node } from '@xyflow/react'

const parser = new Parser()

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

  if (isSP(sql)) {
    const spResult = parseSP(sql, dialect)
    return {
      nodes: spResult.nodes,
      edges: spResult.edges,
      glossary: [],
      rawAst: null,
    }
  }

  const normalizedSql = dialectAdapter(sql, dialect)

  let ast: unknown
  try {
    // node-sql-parser v4: no pasar database option — causa errores con dialects no soportados
    ast = parser.astify(normalizedSql)
  } catch (err) {
    return buildErrorResult(sql, err)
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
  // Para queries cortos o en entorno sin Worker (tests), procesar síncronamente
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
