import { describe, it, expect } from 'vitest'
import { Parser } from 'node-sql-parser'
import { astToGraph } from '@/lib/parser/ast-to-graph'

const parser = new Parser()

// node-sql-parser v4 does not support 'PostgresSQL' — use default (MySQL-compatible)
// The parser outputs the same SELECT AST shape regardless
function parse(sql: string) {
  return parser.astify(sql)
}

describe('astToGraph — SELECT básico', () => {
  it('creates a table node and output node for simple SELECT', () => {
    const ast = parse('SELECT id, name FROM users')
    const { nodes } = astToGraph(ast, 'postgresql')
    const tableNode = nodes.find(n => n.data.nodeType === 'table')
    const outputNode = nodes.find(n => n.data.nodeType === 'output')
    expect(tableNode).toBeDefined()
    expect(tableNode?.data.label).toBe('users')
    expect(outputNode).toBeDefined()
  })

  it('creates a filter node for WHERE clause', () => {
    const ast = parse('SELECT id FROM users WHERE id = 1')
    const { nodes } = astToGraph(ast, 'postgresql')
    const filterNode = nodes.find(n => n.data.nodeType === 'filter')
    expect(filterNode).toBeDefined()
    expect(filterNode?.data.label).toBe('WHERE')
  })

  it('creates a join node for INNER JOIN', () => {
    const ast = parse('SELECT o.id FROM orders o JOIN users u ON o.user_id = u.id')
    const { nodes } = astToGraph(ast, 'postgresql')
    const joinNode = nodes.find(n => n.data.nodeType === 'join')
    expect(joinNode).toBeDefined()
  })

  it('creates an aggregate node for GROUP BY', () => {
    const ast = parse('SELECT category, COUNT(*) FROM products GROUP BY category')
    const { nodes } = astToGraph(ast, 'postgresql')
    const aggNode = nodes.find(n => n.data.nodeType === 'aggregate')
    expect(aggNode).toBeDefined()
    expect(aggNode?.data.label).toBe('GROUP BY')
  })

  it('creates a sort node for ORDER BY', () => {
    const ast = parse('SELECT id FROM users ORDER BY id DESC')
    const { nodes } = astToGraph(ast, 'postgresql')
    const sortNode = nodes.find(n => n.data.nodeType === 'sort')
    expect(sortNode).toBeDefined()
    expect(sortNode?.data.label).toBe('ORDER BY')
  })

  it('creates a limit node for LIMIT', () => {
    const ast = parse('SELECT id FROM users LIMIT 10')
    const { nodes } = astToGraph(ast, 'postgresql')
    const limitNode = nodes.find(n => n.data.nodeType === 'limit')
    expect(limitNode).toBeDefined()
    expect(limitNode?.data.label).toBe('LIMIT')
  })

  it('creates edges connecting the pipeline', () => {
    const ast = parse('SELECT id FROM users WHERE id = 1')
    const { nodes, edges } = astToGraph(ast, 'postgresql')
    expect(edges.length).toBeGreaterThan(0)
    const nodeIds = new Set(nodes.map(n => n.id))
    for (const edge of edges) {
      expect(nodeIds.has(edge.source)).toBe(true)
      expect(nodeIds.has(edge.target)).toBe(true)
    }
  })

  it('generates deterministic node IDs on repeated calls', () => {
    const ast = parse('SELECT id FROM users WHERE id = 1')
    const result1 = astToGraph(ast, 'postgresql')
    const result2 = astToGraph(ast, 'postgresql')
    const ids1 = result1.nodes.map(n => n.id)
    const ids2 = result2.nodes.map(n => n.id)
    expect(ids1).toEqual(ids2)
  })

  it('populates the glossary with FROM and WHERE keywords', () => {
    const ast = parse('SELECT id FROM users WHERE id = 1')
    const { glossary } = astToGraph(ast, 'postgresql')
    expect(glossary.length).toBeGreaterThan(0)
    const keywords = glossary.map(g => g.keyword)
    expect(keywords).toContain('FROM')
    expect(keywords).toContain('WHERE')
  })
})
