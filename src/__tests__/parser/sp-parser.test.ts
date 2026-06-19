import { describe, it, expect } from 'vitest'
import { isSP, parseSP } from '@/lib/parser/sp-parser'

describe('isSP', () => {
  it('detects T-SQL CREATE PROCEDURE', () => {
    expect(isSP('CREATE PROCEDURE dbo.GetOrders @UserId INT AS BEGIN SELECT * FROM orders END')).toBe(true)
  })
  it('detects CREATE PROC shorthand', () => {
    expect(isSP('CREATE PROC GetOrders AS BEGIN SELECT 1 END')).toBe(true)
  })
  it('returns false for SELECT', () => {
    expect(isSP('SELECT * FROM users')).toBe(false)
  })
})

describe('parseSP — basic SP', () => {
  const sql = `
    CREATE PROCEDURE dbo.GetActiveOrders
      @UserId INT,
      @StatusFilter NVARCHAR(50) = NULL OUTPUT
    AS
    BEGIN
      DECLARE @Count INT
      IF @StatusFilter IS NOT NULL
      BEGIN
        SELECT id, total FROM orders WHERE user_id = 1
      END
      WHILE @Count > 0
      BEGIN
        SELECT id FROM queue
      END
    END
  `

  it('extracts procedure name', () => {
    const result = parseSP(sql, 'sqlserver')
    expect(result.procedureName).toBe('GetActiveOrders')
  })

  it('extracts params with direction', () => {
    const result = parseSP(sql, 'sqlserver')
    expect(result.params.length).toBeGreaterThanOrEqual(1)
    const userId = result.params.find(p => p.name === 'UserId')
    expect(userId?.direction).toBe('IN')
    const statusFilter = result.params.find(p => p.name === 'StatusFilter')
    expect(statusFilter?.direction).toBe('OUT')
  })

  it('creates procedure node', () => {
    const result = parseSP(sql, 'sqlserver')
    const proc = result.nodes.find(n => n.data.nodeType === 'procedure')
    expect(proc).toBeDefined()
    expect(proc?.data.label).toContain('GetActiveOrders')
  })

  it('creates param nodes', () => {
    const result = parseSP(sql, 'sqlserver')
    const params = result.nodes.filter(n => n.data.nodeType === 'param')
    expect(params.length).toBeGreaterThanOrEqual(1)
  })

  it('creates declare node', () => {
    const result = parseSP(sql, 'sqlserver')
    const declNodes = result.nodes.filter(n => n.data.nodeType === 'declare')
    expect(declNodes.length).toBeGreaterThan(0)
    expect(declNodes[0].data.label).toContain('Count')
  })

  it('creates condition node for IF', () => {
    const result = parseSP(sql, 'sqlserver')
    const cond = result.nodes.find(n => n.data.nodeType === 'condition')
    expect(cond).toBeDefined()
  })

  it('creates loop node for WHILE with back-edge', () => {
    const result = parseSP(sql, 'sqlserver')
    const loop = result.nodes.find(n => n.data.nodeType === 'loop')
    expect(loop).toBeDefined()
    const backEdge = result.edges.find(e => e.source === loop?.id && e.target === loop?.id)
    expect(backEdge).toBeDefined()
  })
})

describe('parseSP — simple SP sin body', () => {
  it('handles SP with no params', () => {
    const sql = `CREATE PROCEDURE GetAll AS BEGIN SELECT * FROM users END`
    const result = parseSP(sql, 'sqlserver')
    expect(result.procedureName).toBe('GetAll')
    expect(result.params).toEqual([])
    expect(result.nodes.some(n => n.data.nodeType === 'procedure')).toBe(true)
  })
})
