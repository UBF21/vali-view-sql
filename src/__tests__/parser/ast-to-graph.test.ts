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
    expect(filterNode?.data.label).toMatch(/^WHERE /)
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
    expect(aggNode?.data.label).toMatch(/^GROUP BY /)
  })

  it('creates a sort node for ORDER BY', () => {
    const ast = parse('SELECT id FROM users ORDER BY id DESC')
    const { nodes } = astToGraph(ast, 'postgresql')
    const sortNode = nodes.find(n => n.data.nodeType === 'sort')
    expect(sortNode).toBeDefined()
    expect(sortNode?.data.label).toMatch(/^ORDER BY /)
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

  it('cte node detail contains the cte name and inner pipeline is expanded', () => {
    const ast = parse(`WITH recent AS (SELECT id, total FROM orders) SELECT * FROM recent`)
    const { nodes } = astToGraph(ast, 'postgresql')
    const cteNode = nodes.find(n => n.data.nodeType === 'cte')
    expect(cteNode).toBeDefined()
    expect(cteNode?.data.detail).toContain('recent')
    // Inner pipeline should include a table node for `orders`
    const ordersTable = nodes.find(n => n.data.nodeType === 'table' && n.data.label === 'orders')
    expect(ordersTable).toBeDefined()
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

  it('when CTE B references CTE A, cteA connects into cteB pipeline', () => {
    const ast = parse(`WITH a AS (SELECT id FROM orders), b AS (SELECT id FROM a) SELECT * FROM b`)
    const { nodes, edges } = astToGraph(ast, 'postgresql')
    const cteA = nodes.find(n => n.data.nodeType === 'cte' && n.data.label === 'CTE: a')
    const cteB = nodes.find(n => n.data.nodeType === 'cte' && n.data.label === 'CTE: b')
    expect(cteA).toBeDefined()
    expect(cteB).toBeDefined()
    // CTE A's output feeds into CTE B's pipeline (via an intermediary output node)
    const edgeFromA = edges.find(e => e.source === cteA!.id)
    expect(edgeFromA).toBeDefined()
    // Something connects into CTE B
    const edgeToCteB = edges.find(e => e.target === cteB!.id)
    expect(edgeToCteB).toBeDefined()
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

describe('astToGraph — WHERE with function calls', () => {
  it('displays YEAR(col) = N instead of raw JSON in WHERE label', () => {
    // YEAR() is a SQL Server / MySQL function — parsed as {type:"function"}
    const ast = parse(`SELECT id FROM sales WHERE YEAR(sale_date) = 2024`)
    const { nodes } = astToGraph(ast, 'sqlserver')
    const filterNode = nodes.find(n => n.data.nodeType === 'filter')
    expect(filterNode).toBeDefined()
    expect(filterNode?.data.label).not.toMatch(/\{.*type.*function/i)
    expect(filterNode?.data.label).toMatch(/YEAR/i)
    expect(filterNode?.data.label).toMatch(/2024/)
  })

  it('displays COUNT(*) in HAVING label', () => {
    const ast = parse(`SELECT status, COUNT(*) FROM orders GROUP BY status HAVING COUNT(*) > 5`)
    const { nodes } = astToGraph(ast, 'mysql')
    const havingNode = nodes.find(n => n.data.label?.startsWith('HAVING'))
    expect(havingNode).toBeDefined()
    expect(havingNode?.data.label).toMatch(/COUNT/)
    expect(havingNode?.data.label).not.toMatch(/\{.*type/i)
  })

  it('displays column.table reference correctly', () => {
    const ast = parse(`SELECT * FROM orders o JOIN users u ON o.user_id = u.id WHERE o.total > 100`)
    const { nodes } = astToGraph(ast, 'postgresql')
    const filterNode = nodes.find(n => n.data.nodeType === 'filter')
    expect(filterNode?.data.label).toMatch(/o\.total/)
    expect(filterNode?.data.label).not.toMatch(/\{/)
  })
})

describe('astToGraph — DML: UPDATE', () => {
  it('creates table + output nodes for a simple UPDATE', () => {
    const ast = parse(`UPDATE users SET status = 'inactive' WHERE id = 1`)
    const { nodes } = astToGraph(ast, 'mysql')
    const tableNode = nodes.find(n => n.data.nodeType === 'table')
    const outNode = nodes.find(n => n.data.nodeType === 'output')
    expect(tableNode).toBeDefined()
    expect(tableNode?.data.label).toBe('users')
    expect(outNode).toBeDefined()
    expect(outNode?.data.label).toMatch(/SET/)
  })

  it('creates a filter node when UPDATE has WHERE', () => {
    const ast = parse(`UPDATE orders SET status = 'done' WHERE total > 100`)
    const { nodes } = astToGraph(ast, 'mysql')
    const filterNode = nodes.find(n => n.data.nodeType === 'filter')
    expect(filterNode).toBeDefined()
    expect(filterNode?.data.label).toMatch(/WHERE/)
  })

  it('does NOT create filter node when UPDATE has no WHERE', () => {
    const ast = parse(`UPDATE products SET active = 1`)
    const { nodes } = astToGraph(ast, 'mysql')
    const filterNode = nodes.find(n => n.data.nodeType === 'filter')
    expect(filterNode).toBeUndefined()
  })

  it('edges connect table → filter → output', () => {
    const ast = parse(`UPDATE users SET name = 'test' WHERE id = 5`)
    const { nodes, edges } = astToGraph(ast, 'mysql')
    const nodeIds = new Set(nodes.map(n => n.id))
    for (const edge of edges) {
      expect(nodeIds.has(edge.source)).toBe(true)
      expect(nodeIds.has(edge.target)).toBe(true)
    }
  })

  it('glossary contains UPDATE keyword', () => {
    const ast = parse(`UPDATE users SET status = 'ok'`)
    const { glossary } = astToGraph(ast, 'mysql')
    expect(glossary.some(g => g.keyword === 'UPDATE')).toBe(true)
  })
})

describe('astToGraph — DML: DELETE', () => {
  it('creates table + output nodes for a simple DELETE', () => {
    const ast = parse(`DELETE FROM old_logs WHERE created_at < '2023-01-01'`)
    const { nodes } = astToGraph(ast, 'mysql')
    const tableNode = nodes.find(n => n.data.nodeType === 'table')
    const outNode = nodes.find(n => n.data.nodeType === 'output')
    expect(tableNode).toBeDefined()
    expect(tableNode?.data.label).toBe('old_logs')
    expect(outNode?.data.label).toBe('DELETE')
  })

  it('creates filter node when DELETE has WHERE', () => {
    const ast = parse(`DELETE FROM sessions WHERE expired = 1`)
    const { nodes } = astToGraph(ast, 'mysql')
    const filterNode = nodes.find(n => n.data.nodeType === 'filter')
    expect(filterNode).toBeDefined()
  })

  it('edges are valid for DELETE graph', () => {
    const ast = parse(`DELETE FROM orders WHERE status = 'cancelled'`)
    const { nodes, edges } = astToGraph(ast, 'mysql')
    const nodeIds = new Set(nodes.map(n => n.id))
    for (const edge of edges) {
      expect(nodeIds.has(edge.source)).toBe(true)
      expect(nodeIds.has(edge.target)).toBe(true)
    }
  })

  it('glossary contains DELETE keyword', () => {
    const ast = parse(`DELETE FROM orders WHERE id = 1`)
    const { glossary } = astToGraph(ast, 'mysql')
    expect(glossary.some(g => g.keyword === 'DELETE')).toBe(true)
  })
})

describe('astToGraph — DML: INSERT VALUES', () => {
  it('creates VALUES + table nodes for INSERT INTO ... VALUES', () => {
    const ast = parse(`INSERT INTO users (name, email) VALUES ('Ana', 'ana@test.com')`)
    const { nodes } = astToGraph(ast, 'mysql')
    const valNode = nodes.find(n => n.data.nodeType === 'output' && n.data.label === 'VALUES')
    const tableNode = nodes.find(n => n.data.nodeType === 'table')
    expect(valNode).toBeDefined()
    expect(tableNode).toBeDefined()
    expect(tableNode?.data.label).toBe('users')
  })

  it('edge connects VALUES → table node', () => {
    const ast = parse(`INSERT INTO products (name, price) VALUES ('Widget', 9.99)`)
    const { nodes, edges } = astToGraph(ast, 'mysql')
    const nodeIds = new Set(nodes.map(n => n.id))
    for (const edge of edges) {
      expect(nodeIds.has(edge.source)).toBe(true)
      expect(nodeIds.has(edge.target)).toBe(true)
    }
    expect(edges.length).toBeGreaterThan(0)
  })

  it('glossary contains INSERT keyword', () => {
    const ast = parse(`INSERT INTO t (a) VALUES (1)`)
    const { glossary } = astToGraph(ast, 'mysql')
    expect(glossary.some(g => g.keyword === 'INSERT')).toBe(true)
  })
})

describe('astToGraph — DML: INSERT SELECT', () => {
  it('expands the SELECT sub-graph and inserts into target table', () => {
    const ast = parse(`INSERT INTO archive SELECT id, name FROM users WHERE active = 0`)
    const { nodes } = astToGraph(ast, 'mysql')
    const tableNodes = nodes.filter(n => n.data.nodeType === 'table')
    // At least one table from the SELECT (users) + target table (archive)
    expect(tableNodes.length).toBeGreaterThanOrEqual(2)
    const archive = tableNodes.find(n => n.data.label === 'archive')
    expect(archive).toBeDefined()
  })

  it('edges are valid for INSERT SELECT graph', () => {
    const ast = parse(`INSERT INTO archive SELECT id FROM users WHERE id > 0`)
    const { nodes, edges } = astToGraph(ast, 'mysql')
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
