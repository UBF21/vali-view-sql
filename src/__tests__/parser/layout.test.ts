import { describe, it, expect } from 'vitest'
import { autoLayout } from '@/lib/parser/layout'
import type { Node, Edge } from '@xyflow/react'
import type { SQLNodeData } from '@/types'

function makeNode(id: string): Node<SQLNodeData> {
  return {
    id,
    type: 'tableNode',
    position: { x: 0, y: 0 },
    data: { nodeType: 'table', label: id, detail: '', clause: '' },
  }
}

function makeEdge(source: string, target: string): Edge {
  return { id: `e-${source}-${target}`, source, target }
}

describe('autoLayout', () => {
  it('assigns unique positions to all nodes', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')]
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')]
    const result = autoLayout(nodes, edges)
    const positions = result.map(n => `${n.position.x},${n.position.y}`)
    const unique = new Set(positions)
    expect(unique.size).toBe(3)
  })

  it('places source nodes (no incoming edges) at level 0 (y=0)', () => {
    const nodes = [makeNode('table1'), makeNode('table2'), makeNode('join')]
    const edges = [makeEdge('table1', 'join'), makeEdge('table2', 'join')]
    const result = autoLayout(nodes, edges)
    const t1 = result.find(n => n.id === 'table1')!
    const t2 = result.find(n => n.id === 'table2')!
    expect(t1.position.y).toBe(0)
    expect(t2.position.y).toBe(0)
  })

  it('places downstream nodes at higher y than their sources', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')]
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')]
    const result = autoLayout(nodes, edges)
    const yA = result.find(n => n.id === 'a')!.position.y
    const yB = result.find(n => n.id === 'b')!.position.y
    const yC = result.find(n => n.id === 'c')!.position.y
    expect(yB).toBeGreaterThan(yA)
    expect(yC).toBeGreaterThan(yB)
  })

  it('returns the same number of nodes as input', () => {
    const nodes = [makeNode('a'), makeNode('b')]
    const edges = [makeEdge('a', 'b')]
    const result = autoLayout(nodes, edges)
    expect(result).toHaveLength(2)
  })

  it('handles a single node with no edges', () => {
    const nodes = [makeNode('solo')]
    const result = autoLayout(nodes, [])
    expect(result[0].position).toEqual({ x: 0, y: 0 })
  })

  it('handles empty nodes array', () => {
    const result = autoLayout([], [])
    expect(result).toEqual([])
  })

  it('self-loops do not affect level assignment', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')]
    const edges = [
      makeEdge('a', 'b'),
      makeEdge('b', 'c'),
      { id: 'loop-b', source: 'b', target: 'b' } as Edge, // self-loop
    ]
    const result = autoLayout(nodes, edges)
    const yA = result.find(n => n.id === 'a')!.position.y
    const yB = result.find(n => n.id === 'b')!.position.y
    const yC = result.find(n => n.id === 'c')!.position.y
    // Self-loop on b must not prevent b from getting a proper level
    expect(yA).toBeLessThan(yB)
    expect(yB).toBeLessThan(yC)
  })

  it('backward alignment: two pipelines of different lengths share the same Y at their merge endpoint', () => {
    // Pipeline 1 (long): p1a → p1b → p1c → p1d → join
    // Pipeline 2 (short): p2a → p2b → join
    // Both p1d and p2b should be at the same Y (one step above join)
    const nodes = [
      makeNode('p1a'), makeNode('p1b'), makeNode('p1c'), makeNode('p1d'),
      makeNode('p2a'), makeNode('p2b'),
      makeNode('join'), makeNode('out'),
    ]
    const edges = [
      makeEdge('p1a', 'p1b'), makeEdge('p1b', 'p1c'), makeEdge('p1c', 'p1d'),
      makeEdge('p1d', 'join'),
      makeEdge('p2a', 'p2b'), makeEdge('p2b', 'join'),
      makeEdge('join', 'out'),
    ]
    const result = autoLayout(nodes, edges)
    const y = (id: string) => result.find(n => n.id === id)!.position.y
    // Last node before join in both pipelines should be at the same Y
    expect(y('p1d')).toBe(y('p2b'))
    // join is below both
    expect(y('join')).toBeGreaterThan(y('p1d'))
    // sources of longer pipeline are above sources of shorter pipeline
    expect(y('p1a')).toBeLessThan(y('p2a'))
  })

  it('CTE pattern: both CTE nodes land at the same Y regardless of pipeline depth', () => {
    // active_users: users → where_au → select_au → cte_au
    // recent_orders: orders → where_ro → groupby_ro → select_ro → cte_ro
    // Both CTEs feed into a join
    const nodes = [
      makeNode('users'), makeNode('where_au'), makeNode('select_au'), makeNode('cte_au'),
      makeNode('orders'), makeNode('where_ro'), makeNode('groupby_ro'), makeNode('select_ro'), makeNode('cte_ro'),
      makeNode('join'), makeNode('out'), makeNode('orderby'),
    ]
    const edges = [
      makeEdge('users', 'where_au'), makeEdge('where_au', 'select_au'), makeEdge('select_au', 'cte_au'),
      makeEdge('orders', 'where_ro'), makeEdge('where_ro', 'groupby_ro'),
      makeEdge('groupby_ro', 'select_ro'), makeEdge('select_ro', 'cte_ro'),
      makeEdge('cte_au', 'join'), makeEdge('cte_ro', 'join'),
      makeEdge('join', 'out'), makeEdge('out', 'orderby'),
    ]
    const result = autoLayout(nodes, edges)
    const y = (id: string) => result.find(n => n.id === id)!.position.y
    // Both CTE nodes must be at the same Y (same distance from join)
    expect(y('cte_au')).toBe(y('cte_ro'))
    // join is below both CTEs
    expect(y('join')).toBeGreaterThan(y('cte_au'))
    // orders table (deeper pipeline) appears above users table
    expect(y('orders')).toBeLessThan(y('users'))
  })
})
