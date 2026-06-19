import type { ParseResult, Step, NodeType } from '@/types'
import type { Edge } from '@xyflow/react'

// Orden de ejecución SQL lógico
const EXECUTION_ORDER: NodeType[] = [
  'table', 'cte', 'temp_table',
  'param',
  'declare',
  'join',
  'filter',    // WHERE primero (clause === 'WHERE')
  'aggregate',
  'filter',    // HAVING después (clause === 'HAVING' o clause === 'FILTER')
  'condition',
  'loop',
  'output',
  'sort',
  'limit',
]

// Descripción legible por nodeType
const NODE_DESCRIPTIONS: Partial<Record<NodeType, string>> = {
  table:      'Data source: rows are loaded from this table into memory.',
  cte:        'Common Table Expression: the subquery is materialized as a named result set.',
  temp_table: 'Temporary table: pre-computed rows from a previous operation.',
  param:      'Stored procedure parameter: input value is bound.',
  declare:    'Local variable declaration: memory slot is initialized.',
  join:       'JOIN: rows from two sources are matched on the condition.',
  filter:     'Filter: rows not matching the condition are discarded.',
  aggregate:  'GROUP BY: rows are grouped and aggregate functions are computed.',
  condition:  'IF/ELSE: execution branches based on the condition result.',
  loop:       'WHILE: the body executes repeatedly while the condition is true.',
  output:     'SELECT: the projected columns are assembled for the result set.',
  sort:       'ORDER BY: the result set is sorted in the specified order.',
  limit:      'LIMIT/TOP: only the first N rows are returned to the caller.',
  subquery:   'Subquery: an inner SELECT is evaluated as a derived table.',
  setop:      'Set operation: two result sets are combined.',
  procedure:  'Stored procedure: the body starts executing.',
}

function getEdgesFrom(nodeId: string, edges: Edge[]): string[] {
  return edges.filter(e => e.source === nodeId).map(e => e.id)
}

export function buildSteps(result: ParseResult): Step[] {
  const steps: Step[] = []
  let stepIndex = 0

  // Precalcular los índices de las dos apariciones de 'filter' en EXECUTION_ORDER
  const filterOccurrences = EXECUTION_ORDER
    .map((t, idx) => t === 'filter' ? idx : -1)
    .filter(idx => idx !== -1)
  // filterOccurrences[0] = primera aparición (WHERE)
  // filterOccurrences[1] = segunda aparición (HAVING)

  // Bucle sobre el orden de ejecución con índice para distinguir las dos pasadas de 'filter'
  for (let i = 0; i < EXECUTION_ORDER.length; i++) {
    const nodeType = EXECUTION_ORDER[i]
    // Encontrar nodos de este tipo, con discriminación WHERE vs HAVING para filter
    const matchingNodes = result.nodes.filter(n => {
      if (n.data.nodeType !== nodeType) return false
      // Para filter: respetar el orden WHERE → HAVING usando el índice de posición
      if (nodeType === 'filter') {
        const clause = n.data.clause ?? ''
        const isWhere = n.data.label === 'WHERE' || clause.startsWith('WHERE')
        const isHaving = n.data.label === 'HAVING' || clause.startsWith('HAVING') || clause === 'FILTER'
        const isFirstFilterPass = i === filterOccurrences[0]
        return isFirstFilterPass ? isWhere : isHaving
      }
      return true
    })

    for (const node of matchingNodes) {
      const description = NODE_DESCRIPTIONS[nodeType] ?? `Execute ${nodeType} step.`
      steps.push({
        id: `step-${stepIndex}`,
        nodeId: node.id,
        title: `Step ${stepIndex + 1}: ${node.data.label}`,
        description,
        edgeIds: getEdgesFrom(node.id, result.edges),
      })
      stepIndex++
    }
  }

  return steps
}

// Decora los nodos del parseResult según el step activo
export function decorateNodesForStep(
  result: ParseResult,
  steps: Step[],
  currentStepIndex: number
) {
  if (steps.length === 0) return result.nodes

  const activeNodeId = steps[currentStepIndex]?.nodeId
  const pastNodeIds = new Set(steps.slice(0, currentStepIndex).map(s => s.nodeId))
  const futureNodeIds = new Set(steps.slice(currentStepIndex + 1).map(s => s.nodeId))

  return result.nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      isActive:
        node.id === activeNodeId
          ? true
          : pastNodeIds.has(node.id)
          ? undefined       // past: opacidad 0.7 (sin override)
          : futureNodeIds.has(node.id)
          ? false           // future: opacidad 0.3
          : undefined,
    },
  }))
}

// Decora los edges: solo los del step activo se animan
export function decorateEdgesForStep(
  result: ParseResult,
  steps: Step[],
  currentStepIndex: number
) {
  if (steps.length === 0) return result.edges
  const activeEdgeIds = new Set(steps[currentStepIndex]?.edgeIds ?? [])
  return result.edges.map(edge => ({
    ...edge,
    animated: activeEdgeIds.has(edge.id),
  }))
}
