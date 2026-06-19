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
})
