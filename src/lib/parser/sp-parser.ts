import { Parser } from 'node-sql-parser'
import type { Node, Edge } from '@xyflow/react'
import type { SQLNodeData } from '@/types'
import { astToGraph } from './ast-to-graph'

const parser = new Parser()

export interface SPParam {
  name: string
  direction: 'IN' | 'OUT' | 'INOUT'
  dataType: string
}

export interface SPParseResult {
  procedureName: string
  params: SPParam[]
  nodes: Node<SQLNodeData>[]
  edges: Edge[]
}

// Detecta si el SQL es un CREATE PROCEDURE
export function isSP(sql: string): boolean {
  return /^\s*CREATE\s+(OR\s+REPLACE\s+)?PROC(EDURE)?\b/i.test(sql.trim())
}

// Extrae el nombre del SP
function extractProcName(sql: string): string {
  const m = sql.match(/CREATE\s+(?:OR\s+REPLACE\s+)?PROC(?:EDURE)?\s+(?:\[?[\w.]+\]?\.)?\[?(\w+)\]?/i)
  return m?.[1] ?? 'procedure'
}

// Extrae parámetros del SP
function extractParams(sql: string): SPParam[] {
  // Extrae la sección de parámetros entre el nombre del proc y AS/BEGIN
  const paramSection = sql.match(
    /CREATE\s+(?:OR\s+REPLACE\s+)?PROC(?:EDURE)?\s+\S+\s*\(?([\s\S]*?)\)?\s*(?:AS|BEGIN)/i
  )?.[1] ?? ''

  if (!paramSection.trim()) return []

  return paramSection
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      // T-SQL: @name [IN|OUT|INOUT] DATATYPE [= default] [OUTPUT]
      // PostgreSQL: [IN|OUT|INOUT] name DATATYPE
      const isOutput = /\bOUTPUT\b/i.test(p)
      const nameMatch = p.match(/@(\w+)/) ?? p.match(/(?:IN|OUT|INOUT)?\s+(\w+)\s+\w/i)
      const name = nameMatch?.[1] ?? 'param'
      const dirMatch = p.match(/\b(INOUT|OUT|OUTPUT|IN)\b/i)?.[1]?.toUpperCase()
      const direction: SPParam['direction'] =
        isOutput || dirMatch === 'OUT' || dirMatch === 'OUTPUT'
          ? 'OUT'
          : dirMatch === 'INOUT'
          ? 'INOUT'
          : 'IN'
      const typeMatch = p.match(/(?:@\w+|IN|OUT|INOUT)\s+(\w+(?:\([^)]+\))?)/i)
      const dataType = typeMatch?.[1] ?? 'UNKNOWN'
      return { name, direction, dataType }
    })
}

// Extrae el body del SP (entre BEGIN...END o después de AS)
function extractBody(sql: string): string {
  // Intenta extraer BEGIN...END
  const beginEnd = sql.match(/\bBEGIN\b([\s\S]*)\bEND\b\s*$/i)
  if (beginEnd) return beginEnd[1].trim()
  // Fallback: todo lo que viene después de AS
  const afterAs = sql.match(/\bAS\b\s*([\s\S]+)$/i)
  return afterAs?.[1].trim() ?? ''
}

// Parsea el body del SP línea por línea para generar nodos
function parseBody(
  body: string,
  dialect: 'postgresql' | 'mysql' | 'sqlserver'
): { nodes: Node<SQLNodeData>[]; edges: Edge[] } {
  const nodes: Node<SQLNodeData>[] = []
  const edges: Edge[] = []
  let counter = 0
  let prevId: string | null = null

  const makeId = (type: string) => `${type}-sp-${counter++}`

  // Tokenizar statements básicos con regex
  // DECLARE
  const declareRe = /DECLARE\s+@(\w+)\s+(\w+(?:\([^)]+\))?)/gi
  let m: RegExpExecArray | null
  while ((m = declareRe.exec(body)) !== null) {
    const id = makeId('declare')
    nodes.push({
      id,
      type: 'declareNode',
      position: { x: 0, y: 0 },
      data: {
        nodeType: 'declare',
        label: `DECLARE @${m[1]}`,
        detail: `${m[2]}`,
        clause: 'DECLARE',
      },
    })
    if (prevId) edges.push(makeFlowEdge(prevId, id, `e-${prevId}-${id}`))
    prevId = id
  }

  // IF/ELSE
  const ifRe = /IF\s+(.+?)(?=\s+BEGIN|\s+ELSE|\s*\n\s*(?:BEGIN|SELECT|INSERT|UPDATE|DELETE|PRINT))/gi
  while ((m = ifRe.exec(body)) !== null) {
    const id = makeId('condition')
    nodes.push({
      id,
      type: 'conditionNode',
      position: { x: 0, y: 0 },
      data: {
        nodeType: 'condition',
        label: 'IF',
        detail: m[1].trim().substring(0, 60),
        clause: 'IF',
      },
    })
    if (prevId) edges.push(makeFlowEdge(prevId, id, `e-${prevId}-${id}`))
    prevId = id
  }

  // WHILE
  const whileRe = /WHILE\s+(.+?)(?=\s+BEGIN|\s*\n)/gi
  while ((m = whileRe.exec(body)) !== null) {
    const id = makeId('loop')
    nodes.push({
      id,
      type: 'loopNode',
      position: { x: 0, y: 0 },
      data: {
        nodeType: 'loop',
        label: 'WHILE',
        detail: m[1].trim().substring(0, 60),
        clause: 'WHILE',
      },
    })
    // Loop back-edge
    edges.push({
      id: `loop-back-${id}`,
      source: id,
      target: id,
      animated: true,
      style: { stroke: '#FB7185', strokeWidth: 1.5, strokeDasharray: '4,3' },
    })
    if (prevId) edges.push(makeFlowEdge(prevId, id, `e-${prevId}-${id}`))
    prevId = id
  }

  // SELECT statements dentro del body
  const selectRe = /\b(SELECT\s[\s\S]+?)(?=\n\s*(?:DECLARE|IF|WHILE|INSERT|UPDATE|DELETE|END|$))/gi
  while ((m = selectRe.exec(body)) !== null) {
    const innerSql = m[1].trim()
    try {
      const innerAst = parser.astify(innerSql)
      const innerGraph = astToGraph(Array.isArray(innerAst) ? innerAst[0] : innerAst, dialect)
      // Prefixear los IDs para evitar colisiones
      const prefix = `sp-sel-${counter++}-`
      innerGraph.nodes.forEach((n) =>
        nodes.push({ ...n, id: prefix + n.id, type: n.type })
      )
      innerGraph.edges.forEach((e) =>
        edges.push({
          ...e,
          id: prefix + e.id,
          source: prefix + e.source,
          target: prefix + e.target,
        })
      )
      if (prevId && innerGraph.nodes[0]) {
        edges.push(makeFlowEdge(prevId, prefix + innerGraph.nodes[0].id, `e-${prevId}-inner-${counter}`))
      }
      if (innerGraph.nodes.length > 0) {
        prevId = prefix + innerGraph.nodes[innerGraph.nodes.length - 1].id
      }
    } catch {
      // skip malformed inner select
    }
  }

  return { nodes, edges }
}

function makeFlowEdge(source: string, target: string, id: string): Edge {
  return {
    id,
    source,
    target,
    animated: false,
    style: { stroke: '#5F5E5A', strokeWidth: 1.5 },
  }
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

// Entry point principal
export function parseSP(
  sql: string,
  dialect: 'postgresql' | 'mysql' | 'sqlserver'
): SPParseResult {
  const procedureName = extractProcName(sql)
  const params = extractParams(sql)
  const body = extractBody(sql)

  // Nodo procedure container — ID único por SP usando hash del nombre o del SQL
  const procId = `procedure-${hashStr(procedureName !== 'procedure' ? procedureName : sql.slice(0, 50))}`
  const procNode: Node<SQLNodeData> = {
    id: procId,
    type: 'procedureNode',
    position: { x: 0, y: 0 },
    data: {
      nodeType: 'procedure',
      label: `SP: ${procedureName}`,
      detail: `${params.length} param${params.length !== 1 ? 's' : ''}`,
      clause: 'CREATE PROCEDURE',
    },
  }

  // Nodos param
  const paramNodes: Node<SQLNodeData>[] = params.map((p, i) => ({
    id: `param-${i}`,
    type: 'paramNode',
    position: { x: 0, y: 0 },
    data: {
      nodeType: 'param',
      label: `@${p.name}`,
      detail: `${p.direction} ${p.dataType}`,
      clause: 'PARAM',
      paramDirection: p.direction,
    },
  }))

  // Edges param → procedure
  const paramEdges: Edge[] = paramNodes.map((pn) => ({
    id: `e-${pn.id}-${procId}`,
    source: pn.id,
    target: procId,
    animated: false,
    style: { stroke: '#818CF8', strokeWidth: 1.5 },
  }))

  // Body nodes/edges
  const { nodes: bodyNodes, edges: bodyEdges } = body ? parseBody(body, dialect) : { nodes: [], edges: [] }

  // Edge procedure → primer nodo del body
  const bodyStartEdges: Edge[] = bodyNodes[0]
    ? [
        {
          id: `e-${procId}-body-0`,
          source: procId,
          target: bodyNodes[0].id,
          animated: false,
          style: { stroke: '#6366F1', strokeWidth: 1.5 },
        },
      ]
    : []

  return {
    procedureName,
    params,
    nodes: [...paramNodes, procNode, ...bodyNodes],
    edges: [...paramEdges, ...bodyStartEdges, ...bodyEdges],
  }
}
