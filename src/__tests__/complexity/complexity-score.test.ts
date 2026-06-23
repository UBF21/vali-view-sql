import { describe, it, expect } from 'vitest'
import { computeComplexity } from '@/lib/complexity/complexity-score'
import type { ParseResult } from '@/types'
import type { Node, Edge } from '@xyflow/react'
import type { SQLNodeData } from '@/types'

function makeNode(nodeType: SQLNodeData['nodeType']): Node<SQLNodeData> {
  return {
    id: nodeType,
    type: nodeType,
    position: { x: 0, y: 0 },
    data: { nodeType, label: nodeType, detail: '', clause: '' },
  }
}

function makeResult(nodeTypes: SQLNodeData['nodeType'][]): ParseResult {
  return {
    nodes: nodeTypes.map(makeNode),
    edges: [] as Edge[],
    glossary: [],
    rawAst: null,
  }
}

describe('computeComplexity', () => {
  it('returns Simple for a single table query', () => {
    const result = computeComplexity(makeResult(['table', 'output']))
    expect(result.level).toBe('Simple')
    expect(result.score).toBeLessThanOrEqual(3)
  })

  it('returns Moderate for 2 joins', () => {
    const result = computeComplexity(makeResult(['table', 'table', 'table', 'join', 'join', 'output']))
    expect(result.score).toBeGreaterThanOrEqual(4)
  })

  it('returns Complex when subqueries present', () => {
    const result = computeComplexity(makeResult(['table', 'subquery', 'subquery', 'join', 'output']))
    expect(result.score).toBeGreaterThanOrEqual(8)
    expect(result.level).toBe('Complex')
  })

  it('returns Very Complex for procedure with many constructs', () => {
    const result = computeComplexity(makeResult([
      'table','table','join','join','join','subquery','subquery','cte','procedure','output',
    ]))
    expect(result.level).toBe('Very Complex')
  })

  it('breakdown contains per-category counts', () => {
    const result = computeComplexity(makeResult(['table', 'join', 'subquery', 'cte', 'output']))
    expect(result.breakdown.tableCount).toBe(1)
    expect(result.breakdown.joinCount).toBe(1)
    expect(result.breakdown.subqueryCount).toBe(1)
    expect(result.breakdown.cteCount).toBe(1)
  })
})
