import { MarkerType, type Node, type Edge } from '@xyflow/react'
import type { Dialect, SQLNodeData, GlossaryEntry } from '@/types'

interface GraphResult {
  nodes: Node<SQLNodeData>[]
  edges: Edge[]
  glossary: GlossaryEntry[]
}

function createIdGen() {
  let c = 0
  return (type: string) => `${type}-${c++}`
}

export function astToGraph(ast: unknown, _dialect: Dialect): GraphResult {
  const nextId = createIdGen()
  return astToGraphInner(ast, _dialect, nextId, new Map(), new Set())
}

function astToGraphInner(
  ast: unknown,
  _dialect: Dialect,
  nextId: (type: string) => string,
  parentCteMap: Map<string, string>,
  parentCteNames: Set<string>,
): GraphResult {
  const nodes: Node<SQLNodeData>[] = []
  const edges: Edge[] = []
  const glossary: GlossaryEntry[] = []

  // node-sql-parser puede retornar array para multi-statement
  const stmt = Array.isArray(ast)
    ? (ast[0] as Record<string, unknown>)
    : (ast as Record<string, unknown>)

  if (!stmt) return { nodes, edges, glossary }
  if (stmt.type === 'update') return buildUpdateGraph(stmt, nextId)
  if (stmt.type === 'delete') return buildDeleteGraph(stmt, nextId)
  if (stmt.type === 'insert') return buildInsertGraph(stmt, _dialect, nextId)
  if (stmt.type === 'merge') return buildMergeGraph(stmt, nextId)
  if (stmt.type === 'pivot' || stmt.type === 'unpivot') return buildPivotGraph(stmt, nextId)
  if (stmt.type !== 'select') return { nodes, edges, glossary }

  // ── SET OPERATIONS (UNION / INTERSECT / EXCEPT) ───────────────────────────
  if (stmt._next && stmt.set_op) {
    const setOp = (stmt.set_op as string).toUpperCase()
    const setopId = nextId('setop')

    const leftStmt = { ...stmt, _next: undefined, set_op: undefined } as Record<string, unknown>
    const rightStmt = stmt._next as Record<string, unknown>
    const leftResult = astToGraphInner(leftStmt, _dialect, nextId, parentCteMap, parentCteNames)
    const rightResult = astToGraphInner(rightStmt, _dialect, nextId, parentCteMap, parentCteNames)

    for (const n of leftResult.nodes) nodes.push(n)
    for (const n of rightResult.nodes) nodes.push(n)
    for (const e of leftResult.edges) edges.push(e)
    for (const e of rightResult.edges) edges.push(e)

    nodes.push({
      id: setopId,
      type: 'setopNode',
      position: { x: 0, y: 0 },
      data: { nodeType: 'setop', label: setOp, detail: `Combines results with ${setOp}`, clause: 'UNION' },
    })

    const leftOutput = leftResult.nodes.find(n => n.data.nodeType === 'output')
    const rightOutput = rightResult.nodes.find(n => n.data.nodeType === 'output')
    const leftLast = leftOutput ?? leftResult.nodes[leftResult.nodes.length - 1]
    const rightLast = rightOutput ?? rightResult.nodes[rightResult.nodes.length - 1]

    if (leftLast) edges.push(makeDataEdge(leftLast.id, setopId))
    if (rightLast) edges.push(makeDataEdge(rightLast.id, setopId))

    for (const g of leftResult.glossary) glossary.push(g)
    for (const g of rightResult.glossary) glossary.push(g)
    glossary.push({ keyword: setOp, role: 'Set Operation', detail: 'Combines rows from two queries' })

    return { nodes, edges, glossary }
  }

  let lastNodeId: string | null = null
  const sourceNodeIds: string[] = []

  // Inherit CTEs from parent scope (enables cross-CTE references in nested calls)
  const cteNames = new Set<string>(parentCteNames)
  const cteNodeMap = new Map<string, string>(parentCteMap)

  // ── CTEs (WITH clause) — TWO-PASS ─────────────────────────────────────────
  // Pass 1: register all CTE names first so forward/cross-CTE references work
  // Pass 2: expand each CTE body recursively
  const withClauses = stmt.with as Array<Record<string, unknown>> | null

  if (Array.isArray(withClauses) && withClauses.length > 0) {
    // ── Pass 1: create CTE nodes and register names ──────────────────────────
    type CteEntry = { cteName: string; cteId: string; cteAst: Record<string, unknown> | undefined }
    const cteQueue: CteEntry[] = []

    for (const cteEntry of withClauses) {
      // node-sql-parser stores CTE name as { value: string } or as a plain string
      const rawName = cteEntry.name
      const cteName: string =
        typeof rawName === 'string'
          ? rawName
          : ((rawName as Record<string, unknown>)?.value as string | undefined) ?? 'cte'

      // CTE body may be wrapped in { ast: ... } or be the AST directly
      const cteStmtWrapper = cteEntry.stmt as Record<string, unknown>
      const cteAst = (
        cteStmtWrapper?.type === 'select'
          ? cteStmtWrapper
          : (cteStmtWrapper?.ast as Record<string, unknown> | undefined)
      )

      const cteId = nextId('cte')
      nodes.push({
        id: cteId,
        type: 'cteNode',
        position: { x: 0, y: 0 },
        data: { nodeType: 'cte', label: `CTE: ${cteName}`, detail: `Creates a temporary result set named ${cteName}.`, clause: 'WITH' },
      })

      cteNames.add(cteName)
      cteNodeMap.set(cteName, cteId)
      cteQueue.push({ cteName, cteId, cteAst })

      glossary.push({ keyword: 'WITH', role: 'CTE', detail: `Defines reusable subquery "${cteName}"` })
    }

    // ── Pass 2: expand CTE bodies ────────────────────────────────────────────
    for (const { cteId, cteAst } of cteQueue) {
      if (!cteAst) continue

      // Process only the base (non-recursive) SELECT — strip _next/set_op
      const baseAst: Record<string, unknown> = { ...cteAst, _next: undefined, set_op: undefined }
      // Mark as select if the node type is missing (some parser versions omit it)
      if (!baseAst.type) baseAst.type = 'select'

      // Inner call inherits the full cteNodeMap so cross-CTE refs resolve correctly
      const inner = astToGraphInner(baseAst, _dialect, nextId, cteNodeMap, cteNames)

      for (const n of inner.nodes) nodes.push(n)
      for (const e of inner.edges) edges.push(e)
      for (const g of inner.glossary) glossary.push(g)

      // Connect the last pipeline node → CTE node
      const lastInner = inner.nodes[inner.nodes.length - 1]
      if (lastInner) {
        edges.push(makeDataEdge(lastInner.id, cteId))
      }

      // Handle WITH RECURSIVE: add self-reference loop edge + expand recursive member tables
      if (cteAst._next) {
        const recursiveAst = cteAst._next as Record<string, unknown>

        // Visual loop edge for the recursive step
        edges.push({
          id: `cte-loop-${cteId}`,
          source: cteId,
          target: cteId,
          animated: false,
          style: { stroke: '#8B7CF8', strokeWidth: 1.5, strokeDasharray: '6,4' },
        })

        // Create TABLE nodes for non-CTE tables in the recursive member
        const recursiveFrom = (recursiveAst.from as Array<Record<string, unknown>> | null) ?? []
        const seenRecursive = new Set<string>()
        for (const fromItem of recursiveFrom) {
          const refTable = fromItem.table as string | undefined
          if (!refTable || cteNames.has(refTable) || seenRecursive.has(refTable)) continue
          seenRecursive.add(refTable)
          const tId = nextId('table')
          nodes.push({
            id: tId,
            type: 'tableNode',
            position: { x: 0, y: 0 },
            data: {
              nodeType: 'table',
              label: refTable,
              detail: `Loads base data from ${refTable}.`,
              clause: `FROM ${refTable}`,
            },
          })
          edges.push(makeDataEdge(tId, cteId))
        }
      }
    }
  }

  // ── FROM + JOINs ─────────────────────────────────────────────────────────
  const fromList = stmt.from as Array<Record<string, unknown>> | null

  if (Array.isArray(fromList)) {
    for (const fromItem of fromList) {
      // ── Subquery in FROM ─────────────────────────────────────────────────
      if (!fromItem.table && fromItem.expr) {
        const exprObj = fromItem.expr as Record<string, unknown>
        const subAst = exprObj.ast as Record<string, unknown> | undefined
        const alias = fromItem.as as string | null
        const subId = nextId('subquery')
        const subGraph = subAst
          ? astToGraphInner(subAst, _dialect, nextId, cteNodeMap, cteNames)
          : { nodes: [], edges: [] }
        nodes.push({
          id: subId,
          type: 'subqueryNode',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'subquery',
            label: 'Subquery',
            detail: alias ? `Nested SELECT AS ${alias}` : 'Nested SELECT',
            clause: 'FROM',
            subGraph: { nodes: subGraph.nodes, edges: subGraph.edges },
          },
        })
        sourceNodeIds.push(subId)
        lastNodeId = subId
        glossary.push({ keyword: 'FROM', role: 'Source', detail: 'Derived table from a subquery' })
        continue
      }

      const tableName = (fromItem.table as string) ?? 'table'
      const alias = fromItem.as as string | null

      if (fromItem.join) {
        // ── JOIN item ─────────────────────────────────────────────────────
        const joinType = fromItem.join as string
        const joinId = nextId('join')
        const onCondition = stringifyCondition(fromItem.on)

        // Reuse CTE node if this table is a CTE reference; otherwise create TABLE node
        let joinedTableId: string
        if (cteNodeMap.has(tableName)) {
          joinedTableId = cteNodeMap.get(tableName)!
        } else {
          const joinedLabel = alias ? `${tableName} (${alias})` : tableName
          joinedTableId = nextId('table')
          nodes.push({
            id: joinedTableId,
            type: 'tableNode',
            position: { x: 0, y: 0 },
            data: {
              nodeType: 'table',
              label: joinedLabel,
              detail: `Loads base data from the ${joinedLabel} table.`,
              clause: `${joinType} ${tableName}${alias ? ` ${alias}` : ''}`,
            },
          })
        }

        nodes.push({
          id: joinId,
          type: 'joinNode',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'join',
            label: `${joinType} ON ${onCondition}`,
            detail: `${joinType}: matches where ${onCondition}.`,
            clause: `${joinType} ${tableName} ON ${onCondition}`,
          },
        })

        // Left sources → left handle; joined table → right handle
        for (const srcId of sourceNodeIds) {
          edges.push(makeJoinEdge(srcId, joinId, 'left'))
        }
        if (lastNodeId && !sourceNodeIds.includes(lastNodeId)) {
          edges.push(makeJoinEdge(lastNodeId, joinId, 'left'))
        }
        edges.push(makeJoinEdge(joinedTableId, joinId, 'right'))
        sourceNodeIds.push(joinId)
        lastNodeId = joinId
        glossary.push({
          keyword: joinType.split(' ')[0],
          role: 'Join',
          detail: 'Combines rows based on a matching column',
        })
      } else {
        // ── Regular FROM item ─────────────────────────────────────────────
        if (cteNodeMap.has(tableName)) {
          // CTE reference — use the existing CTE node as source
          const cteId = cteNodeMap.get(tableName)!
          sourceNodeIds.push(cteId)
          lastNodeId = cteId
          continue
        }

        const isTemp = tableName.startsWith('tmp_')
        const nodeType = isTemp ? 'temp_table' : 'table'
        const reactNodeType = isTemp ? 'tempTableNode' : 'tableNode'

        const tableId = nextId('table')
        const mainLabel = alias ? `${tableName} (${alias})` : tableName
        nodes.push({
          id: tableId,
          type: reactNodeType,
          position: { x: 0, y: 0 },
          data: {
            nodeType,
            label: mainLabel,
            detail: isTemp ? 'Temporary table' : `Loads base data from the ${mainLabel} table.`,
            clause: `FROM ${tableName}${alias ? ` AS ${alias}` : ''}`,
          },
        })
        sourceNodeIds.push(tableId)
        lastNodeId = tableId
        glossary.push({ keyword: 'FROM', role: 'Source', detail: `Specifies "${tableName}" as the source table` })
      }
    }
  }

  // ── WHERE ─────────────────────────────────────────────────────────────────
  if (stmt.where && lastNodeId) {
    const id = nextId('filter')
    const whereCond = stringifyCondition(stmt.where)
    nodes.push({
      id,
      type: 'filterNode',
      position: { x: 0, y: 0 },
      data: {
        nodeType: 'filter',
        label: `WHERE ${whereCond}`,
        detail: `Keeps only rows where ${whereCond}.`,
        clause: `WHERE ${whereCond}`,
      },
    })
    edges.push(makeFilterEdge(lastNodeId, id))
    lastNodeId = id
    glossary.push({ keyword: 'WHERE', role: 'Filter', detail: 'Filters rows before aggregation' })
  }

  // ── GROUP BY ──────────────────────────────────────────────────────────────
  const groupby = stmt.groupby as Array<Record<string, unknown>> | null
  if (Array.isArray(groupby) && groupby.length > 0 && lastNodeId) {
    const cols = groupby.map(g => (g.column as string) ?? '?').join(', ')
    const id = nextId('aggregate')
    nodes.push({
      id,
      type: 'aggregateNode',
      position: { x: 0, y: 0 },
      data: {
        nodeType: 'aggregate',
        label: `GROUP BY ${cols}`,
        detail: `Groups rows together by ${cols}.`,
        clause: `GROUP BY ${cols}`,
      },
    })
    edges.push(makeDataEdge(lastNodeId, id))
    lastNodeId = id
    glossary.push({ keyword: 'GROUP BY', role: 'Aggregation', detail: 'Groups rows by one or more columns' })
  }

  // ── HAVING ────────────────────────────────────────────────────────────────
  if (stmt.having && lastNodeId) {
    const id = nextId('filter')
    const havingCond = stringifyCondition(stmt.having)
    nodes.push({
      id,
      type: 'filterNode',
      position: { x: 0, y: 0 },
      data: {
        nodeType: 'filter',
        label: `HAVING ${havingCond}`,
        detail: `Keeps only groups where ${havingCond}.`,
        clause: `HAVING ${havingCond}`,
      },
    })
    edges.push(makeFilterEdge(lastNodeId, id))
    lastNodeId = id
    glossary.push({ keyword: 'HAVING', role: 'Filter', detail: 'Filters groups after aggregation' })
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
    const preview = colNames.slice(0, 4).join(', ') + (colNames.length > 4 ? '…' : '')
    nodes.push({
      id,
      type: 'outputNode',
      position: { x: 0, y: 0 },
      data: {
        nodeType: 'output',
        label: `SELECT ${preview}`,
        detail: 'Selects and formats the output columns.',
        clause: `SELECT ${colNames.join(', ')}`,
      },
    })
    edges.push(makeDataEdge(lastNodeId, id))
    lastNodeId = id
    glossary.push({ keyword: 'SELECT', role: 'Projection', detail: 'Specifies which columns to return' })
  }

  // ── ORDER BY ──────────────────────────────────────────────────────────────
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
      data: { nodeType: 'sort', label: `ORDER BY ${cols}`, detail: `Sorts the results by ${cols}.`, clause: `ORDER BY ${cols}` },
    })
    edges.push(makeDataEdge(lastNodeId, id))
    lastNodeId = id
    glossary.push({ keyword: 'ORDER BY', role: 'Sorting', detail: 'Sorts the result set' })
  }

  // ── LIMIT ─────────────────────────────────────────────────────────────────
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
    glossary.push({ keyword: 'LIMIT', role: 'Pagination', detail: 'Restricts the number of returned rows' })
  }

  return { nodes, edges, glossary }
}

// ─── DML helpers ─────────────────────────────────────────────────────────────

function extractInsertTable(raw: unknown): string {
  if (Array.isArray(raw)) return (raw[0]?.table as string) ?? 'table'
  return (raw as string) ?? 'table'
}

interface DmlCtx {
  nodes: Node<SQLNodeData>[]
  edges: Edge[]
  glossary: GlossaryEntry[]
  nextId: (t: string) => string
}

function addWhereNode(where: unknown, lastId: string, ctx: DmlCtx): string {
  if (!where) return lastId
  const cond = stringifyCondition(where)
  const id = ctx.nextId('filter')
  ctx.nodes.push({ id, type: 'filterNode', position: { x: 0, y: 0 },
    data: { nodeType: 'filter', label: `WHERE ${cond}`, detail: `Filters rows.`, clause: `WHERE ${cond}` } })
  ctx.edges.push(makeFilterEdge(lastId, id))
  ctx.glossary.push({ keyword: 'WHERE', role: 'Filter', detail: 'Restricts affected rows' })
  return id
}

function buildUpdateGraph(stmt: Record<string, unknown>, nextId: (t: string) => string): GraphResult {
  const ctx: DmlCtx = { nodes: [], edges: [], glossary: [], nextId }
  const tables = stmt.table as Array<Record<string, unknown>> | null
  const raw = Array.isArray(tables) ? tables[0] : null
  const name = (raw?.table as string) ?? 'table'
  const alias = raw?.as as string | null
  const label = alias ? `${name} (${alias})` : name
  const tableId = nextId('table')
  ctx.nodes.push({ id: tableId, type: 'tableNode', position: { x: 0, y: 0 },
    data: { nodeType: 'table', label, detail: `Target table for UPDATE.`, clause: `UPDATE ${label}` } })
  const lastId = addWhereNode(stmt.where, tableId, ctx)
  const setCols = (stmt.set as Array<Record<string, unknown>> | null)?.map(s => s.column as string).join(', ') ?? '...'
  const setId = nextId('output')
  ctx.nodes.push({ id: setId, type: 'outputNode', position: { x: 0, y: 0 },
    data: { nodeType: 'output', label: `SET ${setCols}`, detail: `Updates: ${setCols}.`, clause: `SET ${setCols}` } })
  ctx.edges.push(makeDataEdge(lastId, setId))
  ctx.glossary.push({ keyword: 'UPDATE', role: 'DML', detail: 'Modifies existing rows' })
  return { nodes: ctx.nodes, edges: ctx.edges, glossary: ctx.glossary }
}

function buildDeleteGraph(stmt: Record<string, unknown>, nextId: (t: string) => string): GraphResult {
  const ctx: DmlCtx = { nodes: [], edges: [], glossary: [], nextId }
  const from = stmt.from as Array<Record<string, unknown>> | null
  const name = Array.isArray(from) ? ((from[0]?.table as string) ?? 'table') : 'table'
  const tableId = nextId('table')
  ctx.nodes.push({ id: tableId, type: 'tableNode', position: { x: 0, y: 0 },
    data: { nodeType: 'table', label: name, detail: `Rows deleted from ${name}.`, clause: `DELETE FROM ${name}` } })
  const lastId = addWhereNode(stmt.where, tableId, ctx)
  const outId = nextId('output')
  ctx.nodes.push({ id: outId, type: 'outputNode', position: { x: 0, y: 0 },
    data: { nodeType: 'output', label: 'DELETE', detail: 'Removes matching rows.', clause: 'DELETE' } })
  ctx.edges.push(makeDataEdge(lastId, outId))
  ctx.glossary.push({ keyword: 'DELETE', role: 'DML', detail: 'Removes rows from a table' })
  return { nodes: ctx.nodes, edges: ctx.edges, glossary: ctx.glossary }
}

function buildInsertSelectGraph(
  stmt: Record<string, unknown>,
  dialect: Dialect,
  nextId: (t: string) => string,
): GraphResult {
  const selectAst = stmt.values as Record<string, unknown>
  const inner = astToGraphInner(selectAst, dialect, nextId, new Map(), new Set())
  const tableName = extractInsertTable(stmt.table)
  const tableId = nextId('table')
  const targetNode: Node<SQLNodeData> = {
    id: tableId, type: 'tableNode', position: { x: 0, y: 0 },
    data: { nodeType: 'table', label: tableName, detail: `Inserts into ${tableName}.`, clause: `INSERT INTO ${tableName}` },
  }
  const lastNode = inner.nodes[inner.nodes.length - 1]
  inner.glossary.push({ keyword: 'INSERT', role: 'DML', detail: 'Inserts SELECT results into a table' })
  return {
    nodes: [...inner.nodes, targetNode],
    edges: lastNode ? [...inner.edges, makeDataEdge(lastNode.id, tableId)] : inner.edges,
    glossary: inner.glossary,
  }
}

function buildInsertGraph(
  stmt: Record<string, unknown>,
  dialect: Dialect,
  nextId: (t: string) => string,
): GraphResult {
  const ctx: DmlCtx = { nodes: [], edges: [], glossary: [], nextId }
  const valuesRaw = stmt.values
  const isSelectValues = typeof valuesRaw === 'object' && !Array.isArray(valuesRaw)
    && (valuesRaw as Record<string, unknown>)?.type === 'select'
  if (isSelectValues) return buildInsertSelectGraph(stmt, dialect, nextId)
  const tableName = extractInsertTable(stmt.table)
  const cols = (stmt.columns as string[] | null)?.join(', ') ?? '...'
  const valId = nextId('output')
  ctx.nodes.push({ id: valId, type: 'outputNode', position: { x: 0, y: 0 },
    data: { nodeType: 'output', label: 'VALUES', detail: 'New row data to insert.', clause: 'VALUES' } })
  const tableId = nextId('table')
  ctx.nodes.push({ id: tableId, type: 'tableNode', position: { x: 0, y: 0 },
    data: { nodeType: 'table', label: tableName, detail: `Inserts into ${tableName} (${cols}).`, clause: `INSERT INTO ${tableName}` } })
  ctx.edges.push(makeDataEdge(valId, tableId))
  ctx.glossary.push({ keyword: 'INSERT', role: 'DML', detail: 'Adds new rows to a table' })
  return { nodes: ctx.nodes, edges: ctx.edges, glossary: ctx.glossary }
}

// ─── MERGE builder ───────────────────────────────────────────────────────────

function makeMergeNode(id: string, targetTable: string, sourceTable: string): Node<SQLNodeData> {
  return {
    id, type: 'mergeNode', position: { x: 0, y: 0 },
    data: { nodeType: 'merge' as const, label: `MERGE INTO ${targetTable}`, detail: `Using ${sourceTable}`, clause: 'MERGE' },
  }
}

function addMergeParticipant(
  table: string, role: 'USING' | 'INTO', mergeId: string,
  nextId: (t: string) => string, ctx: DmlCtx,
): void {
  const id = nextId('table')
  ctx.nodes.push({
    id, type: 'tableNode', position: { x: 0, y: 0 },
    data: { nodeType: 'table', label: table, detail: `${role === 'USING' ? 'Source' : 'Target'} (${role} ${table})`, clause: `${role} ${table}` },
  })
  ctx.edges.push(makeDataEdge(id, mergeId))
}

interface WhenBranch { label: string; detail: string; clause: string }

function addMergeWhenBranch(
  branch: WhenBranch, mergeId: string,
  nextId: (t: string) => string, ctx: DmlCtx,
): void {
  const id = nextId('filter')
  ctx.nodes.push({
    id, type: 'filterNode', position: { x: 0, y: 0 },
    data: { nodeType: 'filter', label: branch.label, detail: branch.detail, clause: branch.clause },
  })
  ctx.edges.push(makeFilterEdge(mergeId, id))
}

function buildMergeGraph(stmt: Record<string, unknown>, nextId: (t: string) => string): GraphResult {
  const ctx: DmlCtx = { nodes: [], edges: [], glossary: [], nextId }
  const targetTable = (stmt.target as Record<string, unknown> | undefined)?.table as string ?? 'target'
  const sourceTable = (stmt.using as Record<string, unknown> | undefined)?.table as string ?? 'source'

  const mergeId = nextId('merge')
  ctx.nodes.push(makeMergeNode(mergeId, targetTable, sourceTable))
  ctx.glossary.push({ keyword: 'MERGE', role: 'DML', detail: 'Performs INSERT, UPDATE, or DELETE based on a join condition' })

  addMergeParticipant(sourceTable, 'USING', mergeId, nextId, ctx)
  addMergeParticipant(targetTable, 'INTO', mergeId, nextId, ctx)
  addMergeWhenBranch({ label: 'WHEN MATCHED', detail: 'UPDATE or DELETE', clause: 'WHEN MATCHED THEN' }, mergeId, nextId, ctx)
  addMergeWhenBranch({ label: 'WHEN NOT MATCHED', detail: 'INSERT', clause: 'WHEN NOT MATCHED THEN' }, mergeId, nextId, ctx)

  return { nodes: ctx.nodes, edges: ctx.edges, glossary: ctx.glossary }
}

// ─── PIVOT / UNPIVOT builder ──────────────────────────────────────────────────

function buildPivotGraph(stmt: Record<string, unknown>, nextId: (t: string) => string): GraphResult {
  const nodes: Node<SQLNodeData>[] = []
  const edges: Edge[] = []
  const glossary: GlossaryEntry[] = []

  const nodeType = stmt.type as 'pivot' | 'unpivot'
  const opId = nextId(nodeType)
  nodes.push({
    id: opId,
    type: `${nodeType}Node`,
    position: { x: 0, y: 0 },
    data: {
      nodeType,
      label: nodeType.toUpperCase(),
      detail: nodeType === 'pivot'
        ? 'Aggregates rows into columns'
        : 'Expands columns into rows',
      clause: nodeType.toUpperCase(),
    },
  })
  glossary.push({
    keyword: nodeType.toUpperCase(),
    role: 'Transform',
    detail: nodeType === 'pivot'
      ? 'Rotates rows into columns using an aggregate function'
      : 'Rotates columns into rows',
  })

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

function makeJoinEdge(source: string, target: string, targetHandle?: string): Edge {
  return {
    id: `e-${source}-${target}-${targetHandle ?? ''}`,
    source,
    target,
    targetHandle,
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

function stringifyArgs(args: unknown): string {
  const a = args as Record<string, unknown> | undefined
  if (a?.type !== 'expr_list') return a ? '...' : ''
  return (a.value as unknown[]).map(stringifyCondition).join(', ')
}

type CondHandler = (c: Record<string, unknown>) => string

const COND_HANDLERS: Record<string, CondHandler> = {
  binary_expr:          c => `${stringifyCondition(c.left)} ${c.operator} ${stringifyCondition(c.right)}`,
  column_ref:           c => `${c.table ? `${c.table}.` : ''}${c.column}`,
  unary_expr:           c => `${c.operator as string} ${stringifyCondition(c.expr)}`,
  function:             c => `${c.name as string}(${stringifyArgs(c.args)})`,
  aggr_func:            c => `${c.name as string}(${stringifyArgs(c.args)})`,
  number:               c => String(c.value),
  single_quote_string:  c => `'${c.value}'`,
  string:               c => `'${c.value}'`,
  null:                 () => 'NULL',
  star:                 () => '*',
  expr_list:            c => (c.value as unknown[]).map(stringifyCondition).join(', '),
}

function stringifyCondition(cond: unknown): string {
  if (!cond) return ''
  if (typeof cond === 'string') return cond
  const c = cond as Record<string, unknown>
  const handler = COND_HANDLERS[c.type as string]
  if (handler) return handler(c)
  return c.value != null ? String(c.value) : '?'
}
