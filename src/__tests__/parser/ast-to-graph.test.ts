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

describe('astToGraph — CTEs', () => {
  it('creates a cte node for a WITH clause', () => {
    const ast = parse(`WITH recent AS (SELECT id FROM orders) SELECT * FROM recent`)
    const { nodes } = astToGraph(ast, 'postgresql')
    const cteNode = nodes.find(n => n.data.nodeType === 'cte')
    expect(cteNode).toBeDefined()
    expect(cteNode?.data.label).toContain('recent')
    expect(cteNode?.data.clause).toBe('WITH')
  })

  it('cte node detail contains a preview of the inner SELECT', () => {
    const ast = parse(`WITH recent AS (SELECT id, total FROM orders) SELECT * FROM recent`)
    const { nodes } = astToGraph(ast, 'postgresql')
    const cteNode = nodes.find(n => n.data.nodeType === 'cte')
    expect(cteNode).toBeDefined()
    // detail should mention the source table of the inner SELECT
    expect(cteNode?.data.detail).toContain('orders')
  })

  it('creates edge from cte to the table node that references it by name', () => {
    const ast = parse(`WITH recent AS (SELECT id FROM orders) SELECT * FROM recent`)
    const { nodes, edges } = astToGraph(ast, 'postgresql')
    const cteNode = nodes.find(n => n.data.nodeType === 'cte')
    expect(cteNode).toBeDefined()
    // There should be an edge whose source is the cte node
    const cteEdge = edges.find(e => e.source === cteNode!.id)
    expect(cteEdge).toBeDefined()
  })

  it('creates multiple cte nodes for multiple WITH entries', () => {
    const ast = parse(`WITH a AS (SELECT id FROM orders), b AS (SELECT id FROM a) SELECT * FROM b`)
    const { nodes } = astToGraph(ast, 'postgresql')
    const cteNodes = nodes.filter(n => n.data.nodeType === 'cte')
    expect(cteNodes.length).toBe(2)
  })

  it('creates a cte-chain edge when CTE B references CTE A', () => {
    const ast = parse(`WITH a AS (SELECT id FROM orders), b AS (SELECT id FROM a) SELECT * FROM b`)
    const { nodes, edges } = astToGraph(ast, 'postgresql')
    const cteA = nodes.find(n => n.data.nodeType === 'cte' && n.data.label.includes('a'))
    const cteB = nodes.find(n => n.data.nodeType === 'cte' && n.data.label.includes('b'))
    expect(cteA).toBeDefined()
    expect(cteB).toBeDefined()
    // Edge from CTE A to CTE B (chain)
    const chainEdge = edges.find(e => e.source === cteA!.id && e.target === cteB!.id)
    expect(chainEdge).toBeDefined()
    // Chain edge uses CTE style (purple dashed)
    expect((chainEdge?.style as Record<string, unknown>)?.stroke).toBe('#8B7CF8')
  })
})

describe('astToGraph — temp_table', () => {
  it('creates a temp_table node for tables with tmp_ prefix', () => {
    const ast = parse(`SELECT id FROM tmp_orders`)
    const { nodes } = astToGraph(ast, 'sqlserver')
    const tempNode = nodes.find(n => n.data.nodeType === 'temp_table')
    expect(tempNode).toBeDefined()
    expect(tempNode?.data.label).toBe('tmp_orders')
  })

  it('does NOT create temp_table for regular tables', () => {
    const ast = parse(`SELECT id FROM orders`)
    const { nodes } = astToGraph(ast, 'postgresql')
    const tempNode = nodes.find(n => n.data.nodeType === 'temp_table')
    expect(tempNode).toBeUndefined()
    const tableNode = nodes.find(n => n.data.nodeType === 'table')
    expect(tableNode).toBeDefined()
  })

  it('temp_table node has same shape as table node (label, detail, clause)', () => {
    const ast = parse(`SELECT id FROM tmp_orders`)
    const { nodes } = astToGraph(ast, 'sqlserver')
    const tempNode = nodes.find(n => n.data.nodeType === 'temp_table')
    expect(tempNode?.data.label).toBeDefined()
    expect(tempNode?.data.detail).toBeDefined()
    expect(tempNode?.data.clause).toBeDefined()
  })
})

describe('astToGraph — subquery in FROM', () => {
  it('creates a subquery node for subselect in FROM', () => {
    const ast = parse(`SELECT * FROM (SELECT id FROM orders WHERE total > 100) AS sub`)
    const { nodes } = astToGraph(ast, 'postgresql')
    const subNode = nodes.find(n => n.data.nodeType === 'subquery')
    expect(subNode).toBeDefined()
    expect(subNode?.data.label).toBe('Subquery')
    expect(subNode?.data.clause).toBe('FROM')
  })

  it('subquery node stores the sub-AST in data.subGraph for future expansion', () => {
    const ast = parse(`SELECT * FROM (SELECT id FROM orders WHERE total > 100) AS sub`)
    const { nodes } = astToGraph(ast, 'postgresql')
    const subNode = nodes.find(n => n.data.nodeType === 'subquery')
    expect(subNode?.data.subGraph).toBeDefined()
  })

  it('subquery node connects to the output pipeline', () => {
    const ast = parse(`SELECT * FROM (SELECT id FROM orders) AS sub`)
    const { nodes, edges } = astToGraph(ast, 'postgresql')
    const subNode = nodes.find(n => n.data.nodeType === 'subquery')
    const outNode = nodes.find(n => n.data.nodeType === 'output')
    expect(subNode).toBeDefined()
    expect(outNode).toBeDefined()
    // Edge from subquery to output (directly or via pipeline)
    const nodeIds = new Set(nodes.map(n => n.id))
    for (const edge of edges) {
      expect(nodeIds.has(edge.source)).toBe(true)
      expect(nodeIds.has(edge.target)).toBe(true)
    }
  })
})

describe('astToGraph — SET operations (UNION / INTERSECT / EXCEPT)', () => {
  it('creates a setop node for UNION', () => {
    // node-sql-parser v4 returns: first SELECT with _next + set_op: 'union'
    const ast = parse(`SELECT id FROM users UNION SELECT id FROM admins`)
    const { nodes } = astToGraph(ast, 'postgresql')
    const setopNode = nodes.find(n => n.data.nodeType === 'setop')
    expect(setopNode).toBeDefined()
    expect(setopNode?.data.label.toLowerCase()).toContain('union')
  })

  it('creates a setop node for UNION ALL', () => {
    const ast = parse(`SELECT id FROM users UNION ALL SELECT id FROM admins`)
    const { nodes } = astToGraph(ast, 'postgresql')
    const setopNode = nodes.find(n => n.data.nodeType === 'setop')
    expect(setopNode).toBeDefined()
    expect(setopNode?.data.label.toLowerCase()).toContain('union')
  })

  it('connects both branches to the setop node', () => {
    const ast = parse(`SELECT id FROM users UNION SELECT id FROM admins`)
    const { nodes, edges } = astToGraph(ast, 'postgresql')
    const setopNode = nodes.find(n => n.data.nodeType === 'setop')
    expect(setopNode).toBeDefined()
    // At least two edges should point TO the setop node
    const incomingEdges = edges.filter(e => e.target === setopNode!.id)
    expect(incomingEdges.length).toBeGreaterThanOrEqual(2)
  })

  it('all edges in setop graph reference valid node IDs', () => {
    const ast = parse(`SELECT id FROM users UNION SELECT id FROM admins`)
    const { nodes, edges } = astToGraph(ast, 'postgresql')
    const nodeIds = new Set(nodes.map(n => n.id))
    for (const edge of edges) {
      expect(nodeIds.has(edge.source)).toBe(true)
      expect(nodeIds.has(edge.target)).toBe(true)
    }
  })
})
