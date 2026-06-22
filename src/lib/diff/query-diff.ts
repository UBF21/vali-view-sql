import type { Node, Edge } from '@xyflow/react'
import type { DiffResult, ParseResult, SQLNodeData } from '@/types'

export interface DiffDecorated {
  nodesA: Node<SQLNodeData>[]
  nodesB: Node<SQLNodeData>[]
  edgesA: Edge[]
  edgesB: Edge[]
  diff: DiffResult
}

export function diffQueries(resultA: ParseResult, resultB: ParseResult): DiffDecorated {
  const mapA = new Map(resultA.nodes.map(n => [n.id, n]))
  const mapB = new Map(resultB.nodes.map(n => [n.id, n]))

  const idsA = new Set(mapA.keys())
  const idsB = new Set(mapB.keys())

  // addedNodes: en B pero no en A
  const addedNodes = [...idsB].filter(id => !idsA.has(id))

  // removedNodes: en A pero no en B
  const removedNodes = [...idsA].filter(id => !idsB.has(id))

  // changedNodes: mismo ID, distinto data.clause o data.detail
  const changedNodes = [...idsA]
    .filter(id => idsB.has(id))
    .filter(id => {
      const a = mapA.get(id)!
      const b = mapB.get(id)!
      return a.data.clause !== b.data.clause || a.data.detail !== b.data.detail
    })

  // Generar summary legible
  const parts: string[] = []
  if (addedNodes.length) parts.push(`${addedNodes.length} added`)
  if (removedNodes.length) parts.push(`${removedNodes.length} removed`)
  if (changedNodes.length) parts.push(`${changedNodes.length} changed`)
  if (parts.length === 0) parts.push('No differences')
  const summary = parts.join(', ')

  const diff: DiffResult = { addedNodes, removedNodes, changedNodes, summary }

  // Decorar nodos con diffStatus para que DiagramCanvas pueda colorearlos
  const decorateNodes = (
    nodes: Node<SQLNodeData>[],
    added: string[],
    removed: string[],
    changed: string[]
  ): Node<SQLNodeData>[] =>
    nodes.map(n => ({
      ...n,
      data: {
        ...n.data,
        diffStatus:
          added.includes(n.id)
            ? 'added'
            : removed.includes(n.id)
            ? 'removed'
            : changed.includes(n.id)
            ? 'changed'
            : 'same',
      },
    }))

  // En el diagrama A: los removedNodes se muestran, los addedNodes no existen
  const nodesA = decorateNodes(
    resultA.nodes,
    [],           // no hay "added" en A
    removedNodes,
    changedNodes
  )

  // En el diagrama B: los addedNodes se muestran, los removedNodes no existen
  const nodesB = decorateNodes(
    resultB.nodes,
    addedNodes,
    [],           // no hay "removed" en B
    changedNodes
  )

  function decorateEdges(edges: Edge[], decoratedNodes: Node<SQLNodeData>[]): Edge[] {
    const statusMap = new Map(decoratedNodes.map(n => [n.id, n.data.diffStatus]))
    return edges.map(e => {
      const srcStatus = statusMap.get(e.source)
      const tgtStatus = statusMap.get(e.target)
      const dominant = srcStatus !== 'same' ? srcStatus : tgtStatus
      if (!dominant || dominant === 'same') return e
      const color = dominant === 'added' ? '#22C55E' : dominant === 'removed' ? '#EF4444' : '#EAB308'
      return { ...e, style: { ...((e.style as object) ?? {}), stroke: color, strokeDasharray: '4 3' } }
    })
  }

  const edgesA = decorateEdges(resultA.edges, nodesA)
  const edgesB = decorateEdges(resultB.edges, nodesB)
  return { nodesA, nodesB, edgesA, edgesB, diff }
}
