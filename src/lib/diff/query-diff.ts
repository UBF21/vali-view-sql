import type { Node } from '@xyflow/react'
import type { DiffResult, ParseResult, SQLNodeData } from '@/types'

export interface DiffDecorated {
  nodesA: Node<SQLNodeData>[]
  nodesB: Node<SQLNodeData>[]
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

  const sameNodes = [...idsA].filter(
    id => idsB.has(id) && !changedNodes.includes(id)
  )

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
    changed: string[],
    same: string[]
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
    changedNodes,
    sameNodes
  )

  // En el diagrama B: los addedNodes se muestran, los removedNodes no existen
  const nodesB = decorateNodes(
    resultB.nodes,
    addedNodes,
    [],           // no hay "removed" en B
    changedNodes,
    sameNodes
  )

  return { nodesA, nodesB, diff }
}
