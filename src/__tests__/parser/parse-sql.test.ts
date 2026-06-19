import { describe, it, expect } from 'vitest'
import { parseSQL } from '@/lib/parser/index'

describe('parseSQL — PostgreSQL', () => {
  it('parses a basic SELECT and returns nodes and edges', () => {
    const result = parseSQL('SELECT id, name FROM users', 'postgresql')
    expect(result.nodes.length).toBeGreaterThan(0)
    expect(result.edges.length).toBeGreaterThan(0)
    expect(result.rawAst).not.toBeNull()
  })

  it('returns error node for invalid SQL', () => {
    const result = parseSQL('THIS IS NOT SQL AT ALL !!!', 'postgresql')
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0].data.hasIssue).toBe(true)
    expect(result.edges).toHaveLength(0)
  })

  it('returns empty result for empty string', () => {
    const result = parseSQL('', 'postgresql')
    expect(result.nodes).toHaveLength(0)
    expect(result.edges).toHaveLength(0)
  })

  it('returns empty result for whitespace-only string', () => {
    const result = parseSQL('   ', 'postgresql')
    expect(result.nodes).toHaveLength(0)
  })

  it('positions nodes at different y levels for multi-clause query', () => {
    const sql = 'SELECT id FROM users WHERE id > 0 ORDER BY id LIMIT 5'
    const result = parseSQL(sql, 'postgresql')
    expect(result.nodes.length).toBeGreaterThan(2)
    const ys = new Set(result.nodes.map(n => n.position.y))
    expect(ys.size).toBeGreaterThan(1)
  })
})

describe('parseSQL — MySQL', () => {
  it('parses backtick identifiers', () => {
    const result = parseSQL('SELECT `id` FROM `users`', 'mysql')
    expect(result.nodes.length).toBeGreaterThan(0)
    expect(result.rawAst).not.toBeNull()
  })
})

describe('parseSQL — SQL Server', () => {
  it('handles bracket identifiers', () => {
    const result = parseSQL('SELECT [id], [name] FROM [users]', 'sqlserver')
    expect(result.nodes.length).toBeGreaterThan(0)
  })

  it('handles NOLOCK hint', () => {
    const result = parseSQL('SELECT id FROM users WITH (NOLOCK)', 'sqlserver')
    expect(result.nodes.length).toBeGreaterThan(0)
    expect(result.rawAst).not.toBeNull()
  })
})
