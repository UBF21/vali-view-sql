import type { ParseResult } from '@/types'
import type { NodeType } from '@/types'

export type ComplexityLevel = 'Simple' | 'Moderate' | 'Complex' | 'Very Complex'

export interface ComplexityBreakdown {
  tableCount:     number
  joinCount:      number
  subqueryCount:  number
  cteCount:       number
  setOpCount:     number
  procedureCount: number
  aggregateCount: number
  conditionCount: number
  loopCount:      number
}

export interface ComplexityResult {
  score:     number
  level:     ComplexityLevel
  breakdown: ComplexityBreakdown
}

// Weights per node type — unlisted types contribute 0
const WEIGHTS: Partial<Record<NodeType, number>> = {
  table:     1,
  join:      1,
  subquery:  3,
  cte:       1,
  setop:     1,
  procedure: 3,
  aggregate: 0.5,
  condition: 1,
  loop:      2,
}

// Thresholds: score <= threshold → level
const LEVELS: Array<[number, ComplexityLevel]> = [
  [3,  'Simple'],
  [7,  'Moderate'],
  [12, 'Complex'],
  [Infinity, 'Very Complex'],
]

function emptyBreakdown(): ComplexityBreakdown {
  return {
    tableCount: 0, joinCount: 0, subqueryCount: 0,
    cteCount: 0,   setOpCount: 0, procedureCount: 0,
    aggregateCount: 0, conditionCount: 0, loopCount: 0,
  }
}

const BREAKDOWN_KEY: Partial<Record<NodeType, keyof ComplexityBreakdown>> = {
  table:     'tableCount',
  join:      'joinCount',
  subquery:  'subqueryCount',
  cte:       'cteCount',
  setop:     'setOpCount',
  procedure: 'procedureCount',
  aggregate: 'aggregateCount',
  condition: 'conditionCount',
  loop:      'loopCount',
}

function countNodes(parseResult: ParseResult): ComplexityBreakdown {
  const counts = emptyBreakdown()
  for (const node of parseResult.nodes) {
    const key = BREAKDOWN_KEY[node.data.nodeType]
    if (key) counts[key]++
  }
  return counts
}

function scoreFromBreakdown(counts: ComplexityBreakdown): number {
  return Math.round(
    counts.tableCount     * (WEIGHTS.table     ?? 0) +
    counts.joinCount      * (WEIGHTS.join      ?? 0) +
    counts.subqueryCount  * (WEIGHTS.subquery  ?? 0) +
    counts.cteCount       * (WEIGHTS.cte       ?? 0) +
    counts.setOpCount     * (WEIGHTS.setop     ?? 0) +
    counts.procedureCount * (WEIGHTS.procedure ?? 0) +
    counts.aggregateCount * (WEIGHTS.aggregate ?? 0) +
    counts.conditionCount * (WEIGHTS.condition ?? 0) +
    counts.loopCount      * (WEIGHTS.loop      ?? 0),
  )
}

function levelFromScore(score: number): ComplexityLevel {
  return (LEVELS.find(([threshold]) => score <= threshold) ?? [Infinity, 'Very Complex'])[1]
}

export function computeComplexity(parseResult: ParseResult): ComplexityResult {
  const breakdown = countNodes(parseResult)
  const score     = scoreFromBreakdown(breakdown)
  const level     = levelFromScore(score)
  return { score, level, breakdown }
}
