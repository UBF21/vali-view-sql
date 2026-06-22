import { describe, it, expect } from 'vitest'
import { parseSQL } from '@/lib/parser/index'

describe('parseSQL — basic', () => {
  it('returns empty result for empty string', () => {
    const r = parseSQL('', 'postgresql')
    expect(r.nodes).toHaveLength(0)
    expect(r.edges).toHaveLength(0)
  })

  it('parses a simple SELECT and returns nodes', () => {
    const r = parseSQL('SELECT id, name FROM users WHERE active = true', 'postgresql')
    expect(r.nodes.length).toBeGreaterThan(0)
    expect(r.nodes[0].data.hasIssue).toBeFalsy()
  })
})

describe('parseSQL — postgresql dialect', () => {
  it('handles RETURNING clause without error', () => {
    const r = parseSQL(
      `INSERT INTO users (name, email) VALUES ('Ana', 'ana@test.com') RETURNING id, name`,
      'postgresql',
    )
    expect(r.nodes.some(n => n.data.hasIssue)).toBe(false)
  })

  it('handles FILTER (WHERE ...) aggregate without error', () => {
    const r = parseSQL(
      `SELECT COUNT(*) FILTER (WHERE status = 'active') AS cnt FROM users`,
      'postgresql',
    )
    expect(r.nodes.some(n => n.data.hasIssue)).toBe(false)
  })

  it('parses CTE query correctly', () => {
    const sql = `WITH active AS (SELECT id FROM users WHERE status = 'active')
SELECT id FROM active`
    const r = parseSQL(sql, 'postgresql')
    expect(r.nodes.some(n => n.data.nodeType === 'cte')).toBe(true)
  })
})

describe('parseSQL — sqlserver dialect', () => {
  it('handles SELECT TOP N without error', () => {
    const r = parseSQL('SELECT TOP 10 id, name FROM orders ORDER BY created_at DESC', 'sqlserver')
    expect(r.nodes.some(n => n.data.hasIssue)).toBe(false)
  })

  it('handles TRY_CAST without error', () => {
    const r = parseSQL(
      `SELECT id, TRY_CAST(value AS decimal(10,2)) AS amount FROM entries`,
      'sqlserver',
    )
    expect(r.nodes.some(n => n.data.hasIssue)).toBe(false)
  })

  it('handles bracket identifiers without error', () => {
    const r = parseSQL(
      `SELECT [name], [email] FROM [employees] WHERE [active] = 1`,
      'sqlserver',
    )
    expect(r.nodes.some(n => n.data.hasIssue)).toBe(false)
  })

  it('handles multi-statement SQL separated by blank lines', () => {
    const sql = `SELECT id, name, SUM(total) AS revenue
INTO #top_customers
FROM customers c
JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.name
HAVING SUM(total) > 10000

SELECT * FROM #top_customers ORDER BY revenue DESC`
    const r = parseSQL(sql, 'sqlserver')
    expect(r.nodes.some(n => n.data.hasIssue)).toBe(false)
    expect(r.nodes.length).toBeGreaterThan(0)
  })

  it('handles temp table references (#table → tmp_table)', () => {
    const r = parseSQL('SELECT * FROM #top_customers ORDER BY revenue DESC', 'sqlserver')
    expect(r.nodes.some(n => n.data.hasIssue)).toBe(false)
  })
})

describe('parseSQL — mysql dialect', () => {
  it('handles backtick identifiers without error', () => {
    const r = parseSQL('SELECT `id`, `name` FROM `users` WHERE `active` = 1', 'mysql')
    expect(r.nodes.some(n => n.data.hasIssue)).toBe(false)
  })

  it('handles GROUP BY with HAVING', () => {
    const r = parseSQL(
      `SELECT status, COUNT(*) AS cnt FROM orders GROUP BY status HAVING COUNT(*) > 5`,
      'mysql',
    )
    expect(r.nodes.some(n => n.data.nodeType === 'aggregate')).toBe(true)
    expect(r.nodes.some(n => n.data.hasIssue)).toBe(false)
  })

  it('handles WITH RECURSIVE', () => {
    const sql = `WITH RECURSIVE nums AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM nums WHERE n < 5
)
SELECT n FROM nums`
    const r = parseSQL(sql, 'mysql')
    expect(r.nodes.some(n => n.data.hasIssue)).toBe(false)
  })
})

describe('parseSQL — unsupported constructs', () => {
  it('returns friendly label for MERGE', () => {
    const r = parseSQL(
      `MERGE target AS t USING source AS s ON t.id = s.id WHEN MATCHED THEN UPDATE SET t.name = s.name`,
      'sqlserver',
    )
    expect(r.nodes).toHaveLength(1)
    expect(r.nodes[0].data.label).toMatch(/MERGE/i)
    expect(r.nodes[0].data.hasIssue).toBe(true)
  })

  it('returns friendly label for PIVOT', () => {
    const r = parseSQL(
      `SELECT * FROM orders PIVOT (SUM(amount) FOR month IN ([Jan],[Feb])) AS p`,
      'sqlserver',
    )
    expect(r.nodes[0].data.label).toMatch(/PIVOT/i)
    expect(r.nodes[0].data.hasIssue).toBe(true)
  })

  it('returns friendly label for CROSS APPLY', () => {
    const r = parseSQL(
      `SELECT e.name, v.total FROM employees e CROSS APPLY (SELECT SUM(amount) AS total FROM orders WHERE emp_id = e.id) v`,
      'sqlserver',
    )
    expect(r.nodes[0].data.label).toMatch(/APPLY/i)
    expect(r.nodes[0].data.hasIssue).toBe(true)
  })
})
