import { MarkerType, type Node, type Edge } from '@xyflow/react'
import type { Dialect, SQLNodeData, GlossaryEntry } from '@/types'

interface GraphResult {
  nodes: Node<SQLNodeData>[]
  edges: Edge[]
  glossary: GlossaryEntry[]
}

let _counter = 0

function nextId(type: string): string {
  return `${type}-${_counter++}`
}

export function astToGraph(ast: unknown, _dialect: Dialect): GraphResult {
  _counter = 0
  const nodes: Node<SQLNodeData>[] = []
  const edges: Edge[] = []
  const glossary: GlossaryEntry[] = []

  // node-sql-parser puede retornar array para multi-statement
  const stmt = Array.isArray(ast)
    ? (ast[0] as Record<string, unknown>)
    : (ast as Record<string, unknown>)

  if (!stmt || stmt.type !== 'select') {
    return { nodes, edges, glossary }
  }

  let lastNodeId: string | null = null
  const sourceNodeIds: string[] = []

  // ── FROM + JOINs ─────────────────────────────────────────────────────────
  // node-sql-parser v4: joins are embedded in the `from` array as items
  // with a `join` property. The first item (no `join` key) is the main table.
  const fromList = stmt.from as Array<Record<string, unknown>> | null

  if (Array.isArray(fromList)) {
    for (const fromItem of fromList) {
      const tableName = (fromItem.table as string) ?? 'table'
      const alias = fromItem.as as string | null

      if (fromItem.join) {
        // This is a JOIN item in the from array
        const joinType = fromItem.join as string
        const joinId = nextId('join')
        nodes.push({
          id: joinId,
          type: 'joinNode',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'join',
            label: joinType,
            detail: `Joins with "${tableName}"${alias ? ` AS ${alias}` : ''}`,
            clause: `${joinType} ${tableName}${alias ? ` AS ${alias}` : ''} ON ${stringifyCondition(fromItem.on)}`,
          },
        })
        // Connect all previous source nodes to this join
        for (const srcId of sourceNodeIds) {
          edges.push(makeJoinEdge(srcId, joinId))
        }
        if (lastNodeId && !sourceNodeIds.includes(lastNodeId)) {
          edges.push(makeJoinEdge(lastNodeId, joinId))
        }
        sourceNodeIds.push(joinId)
        lastNodeId = joinId
        glossary.push({
          keyword: joinType.split(' ')[0],
          role: 'Join',
          detail: `Combines rows based on a matching column`,
        })
      } else {
        // Main table source
        const tableId = nextId('table')
        nodes.push({
          id: tableId,
          type: 'tableNode',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'table',
            label: tableName,
            detail: alias ? `Alias: ${alias}` : 'Source table',
            clause: `FROM ${tableName}${alias ? ` AS ${alias}` : ''}`,
          },
        })
        sourceNodeIds.push(tableId)
        lastNodeId = tableId
        glossary.push({
          keyword: 'FROM',
          role: 'Source',
          detail: `Specifies "${tableName}" as the source table`,
        })
      }
    }
  }

  // ── WHERE ─────────────────────────────────────────────────────────────────
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
    glossary.push({
      keyword: 'WHERE',
      role: 'Filter',
      detail: 'Filters rows before aggregation',
    })
  }

  // ── GROUP BY ──────────────────────────────────────────────────────────────
  // node-sql-parser v4: groupby is Array<{ type: 'column_ref', column: string }>
  const groupby = stmt.groupby as Array<Record<string, unknown>> | null
  if (Array.isArray(groupby) && groupby.length > 0 && lastNodeId) {
    const cols = groupby
      .map(g => (g.column as string) ?? '?')
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
    glossary.push({
      keyword: 'GROUP BY',
      role: 'Aggregation',
      detail: 'Groups rows by one or more columns',
    })
  }

  // ── HAVING ────────────────────────────────────────────────────────────────
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
    glossary.push({
      keyword: 'HAVING',
      role: 'Filter',
      detail: 'Filters groups after aggregation',
    })
  }

  // ── SELECT output ─────────────────────────────────────────────────────────
  if (lastNodeId) {
    const colsRaw = stmt.columns
    let colNames: string[]
    if (colsRaw === '*') {
      colNames = ['*']
    } else if (Array.isArray(colsRaw)) {
      colNames = (colsRaw as Array<Record<string, unknown>>).map(c => {
        if (c.as) return c.as as string
        const expr = c.expr as Record<string, unknown> | undefined
        if (expr?.type === 'aggr_func') return `${expr.name as string}(...)`
        return (expr?.column as string) ?? (expr?.name as string) ?? '*'
      })
    } else {
      colNames = ['*']
    }
    const id = nextId('output')
    const preview =
      colNames.slice(0, 4).join(', ') + (colNames.length > 4 ? '…' : '')
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
    glossary.push({
      keyword: 'SELECT',
      role: 'Projection',
      detail: 'Specifies which columns to return',
    })
  }

  // ── ORDER BY ──────────────────────────────────────────────────────────────
  // node-sql-parser v4: orderby is Array<{ expr: { type, column }, type: 'ASC'|'DESC' }>
  const orderby = stmt.orderby as Array<Record<string, unknown>> | null
  if (Array.isArray(orderby) && orderby.length > 0 && lastNodeId) {
    const cols = orderby
      .map(o => {
        const expr = o.expr as Record<string, unknown> | undefined
        const col = (expr?.column as string) ?? '?'
        const dir = (o.type as string) ?? 'ASC'
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
    glossary.push({
      keyword: 'ORDER BY',
      role: 'Sorting',
      detail: 'Sorts the result set',
    })
  }

  // ── LIMIT ─────────────────────────────────────────────────────────────────
  // node-sql-parser v4: limit is { seperator: '', value: [{ type: 'number', value: N }] }
  if (stmt.limit && lastNodeId) {
    const limitRaw = stmt.limit as Record<string, unknown>
    const valArr = limitRaw.value as Array<Record<string, unknown>> | undefined
    const val = valArr?.[0]?.value ?? '?'
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
    glossary.push({
      keyword: 'LIMIT',
      role: 'Pagination',
      detail: 'Restricts the number of returned rows',
    })
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
