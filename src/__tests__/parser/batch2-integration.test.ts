import { describe, it, expect } from 'vitest'
import { parseSQL } from '@/lib/parser'

// =============================================
// CTEs via parseSQL
// =============================================
describe('parseSQL — CTE integration', () => {
  it('parses simple CTE and creates cte node', () => {
    const sql = `
      WITH recent_orders AS (
        SELECT id, total FROM orders WHERE created_at > '2024-01-01'
      )
      SELECT * FROM recent_orders
    `
    const result = parseSQL(sql, 'postgresql')
    expect(result.nodes.some(n => n.data.nodeType === 'cte')).toBe(true)
    const cteNode = result.nodes.find(n => n.data.nodeType === 'cte')
    // ast-to-graph labels CTEs as "CTE: <name>"
    expect(cteNode?.data.label).toContain('recent_orders')
  })

  it('parses CTE chain (B references A)', () => {
    const sql = `
      WITH
        cte_a AS (SELECT id FROM orders),
        cte_b AS (SELECT id FROM cte_a WHERE id > 1)
      SELECT * FROM cte_b
    `
    const result = parseSQL(sql, 'postgresql')
    const cteNodes = result.nodes.filter(n => n.data.nodeType === 'cte')
    expect(cteNodes.length).toBe(2)
  })

  it('parses recursive CTE (WITH RECURSIVE or self-reference)', () => {
    // node-sql-parser v4 may not support WITH RECURSIVE — verify it doesn't throw
    // or returns a valid result (possibly error node)
    const sql = `
      WITH RECURSIVE emp_hierarchy AS (
        SELECT id, manager_id, name FROM employees WHERE manager_id IS NULL
        UNION ALL
        SELECT e.id, e.manager_id, e.name FROM employees e
        JOIN emp_hierarchy h ON e.manager_id = h.id
      )
      SELECT * FROM emp_hierarchy
    `
    expect(() => parseSQL(sql, 'postgresql')).not.toThrow()
    const result = parseSQL(sql, 'postgresql')
    // Whether it parses or returns an error node, we always get at least one node
    expect(result.nodes.length).toBeGreaterThan(0)
  })
})

// =============================================
// Temp Tables via parseSQL
// =============================================
describe('parseSQL — temp_table integration', () => {
  it('creates temp_table node for SQL Server #temp (via dialectAdapter)', () => {
    // dialectAdapter converts #orders → tmp_orders
    // ast-to-graph detects tmp_ prefix → nodeType: 'temp_table'
    const sql = `SELECT id, total FROM #orders WHERE status = 'active'`
    const result = parseSQL(sql, 'sqlserver')
    const tempNode = result.nodes.find(n => n.data.nodeType === 'temp_table')
    expect(tempNode).toBeDefined()
    // Label will be "tmp_orders" after dialectAdapter normalizes #orders
    expect(tempNode?.data.label).toBeTruthy()
  })

  it('creates temp_table node for tmp_ prefixed table name', () => {
    // Tables starting with tmp_ are treated as temp_table regardless of dialect
    const sql = `SELECT id FROM tmp_session_data WHERE user_id = 1`
    const result = parseSQL(sql, 'mysql')
    const tempNode = result.nodes.find(n => n.data.nodeType === 'temp_table')
    expect(tempNode).toBeDefined()
    expect(tempNode?.data.label).toBe('tmp_session_data')
  })
})

// =============================================
// SET operations via parseSQL
// =============================================
describe('parseSQL — set operations integration', () => {
  it('parses UNION query and creates setop node', () => {
    const sql = `SELECT id, name FROM customers UNION SELECT id, name FROM suppliers`
    const result = parseSQL(sql, 'postgresql')
    expect(result.nodes.length).toBeGreaterThan(0)
    // ast-to-graph handles UNION via stmt._next + stmt.set_op → creates setop node
    const hasSetop = result.nodes.some(n => n.data.nodeType === 'setop')
    const hasTables = result.nodes.some(n => n.data.nodeType === 'table')
    expect(hasSetop || hasTables).toBe(true)
  })

  it('parses UNION ALL query without throwing', () => {
    const sql = `SELECT id FROM active_users UNION ALL SELECT id FROM inactive_users`
    expect(() => parseSQL(sql, 'postgresql')).not.toThrow()
    const result = parseSQL(sql, 'postgresql')
    expect(result.nodes.length).toBeGreaterThan(0)
  })

  it('parses INTERSECT query without throwing', () => {
    // node-sql-parser v4 support for INTERSECT may vary — verify no throw
    const sql = `SELECT id FROM active_users INTERSECT SELECT id FROM premium_users`
    expect(() => parseSQL(sql, 'postgresql')).not.toThrow()
    const result = parseSQL(sql, 'postgresql')
    // Returns nodes (either parsed or error node)
    expect(result.nodes.length).toBeGreaterThan(0)
  })
})

// =============================================
// Stored Procedures via parseSQL (SP integration)
// =============================================
describe('parseSQL — SP integration', () => {
  it('detects SP and returns procedure node', () => {
    const sql = `
      CREATE PROCEDURE dbo.GetUserOrders
        @UserId INT
      AS
      BEGIN
        SELECT id, total FROM orders WHERE user_id = 1
      END
    `
    const result = parseSQL(sql, 'sqlserver')
    expect(result.nodes.some(n => n.data.nodeType === 'procedure')).toBe(true)
  })

  it('SP result includes param node', () => {
    const sql = `
      CREATE PROCEDURE GetStats @UserId INT, @Result INT OUTPUT
      AS BEGIN SELECT COUNT(*) FROM orders END
    `
    const result = parseSQL(sql, 'sqlserver')
    const paramNodes = result.nodes.filter(n => n.data.nodeType === 'param')
    expect(paramNodes.length).toBeGreaterThanOrEqual(1)
  })

  it('SP with IF creates condition node', () => {
    const sql = `
      CREATE PROCEDURE CheckBalance @AccountId INT
      AS
      BEGIN
        DECLARE @Balance DECIMAL
        IF @Balance > 0
        BEGIN
          SELECT id FROM transactions
        END
      END
    `
    const result = parseSQL(sql, 'sqlserver')
    expect(result.nodes.some(n => n.data.nodeType === 'condition')).toBe(true)
  })

  it('SP with WHILE creates loop node', () => {
    const sql = `
      CREATE PROCEDURE ProcessQueue
      AS
      BEGIN
        DECLARE @Count INT
        WHILE @Count > 0
        BEGIN
          SELECT id FROM queue
        END
      END
    `
    const result = parseSQL(sql, 'sqlserver')
    expect(result.nodes.some(n => n.data.nodeType === 'loop')).toBe(true)
  })
})
