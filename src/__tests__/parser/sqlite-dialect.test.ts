import { describe, it, expect } from 'vitest'
import { parseSQL } from '@/lib/parser'

describe('SQLite dialect', () => {
  it('parses a basic SELECT', () => {
    const result = parseSQL('SELECT id, name FROM users WHERE active = 1', 'sqlite')
    expect(result).not.toBeNull()
    expect(result!.nodes.some(n => n.data.nodeType === 'table')).toBe(true)
    expect(result!.nodes.some(n => n.data.nodeType === 'output')).toBe(true)
  })

  it('parses a JOIN query', () => {
    const result = parseSQL(
      'SELECT u.name, o.total FROM users u INNER JOIN orders o ON u.id = o.user_id',
      'sqlite',
    )
    expect(result!.nodes.some(n => n.data.nodeType === 'join')).toBe(true)
  })

  it('parses a CTE query', () => {
    const result = parseSQL(
      'WITH active AS (SELECT id FROM users WHERE active = 1) SELECT * FROM active',
      'sqlite',
    )
    expect(result!.nodes.some(n => n.data.nodeType === 'cte')).toBe(true)
  })

  it('parses LIMIT', () => {
    const result = parseSQL('SELECT id FROM users LIMIT 10', 'sqlite')
    expect(result!.nodes.some(n => n.data.nodeType === 'limit')).toBe(true)
  })
})
