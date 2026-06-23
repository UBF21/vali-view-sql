import { describe, it, expect } from 'vitest'
import { validateAgainstSchema } from '@/lib/analyzers/schema-validator'
import type { Schema } from '@/lib/schema/types'
import { parseSQL } from '@/lib/parser'

const SCHEMA: Schema = {
  users: {
    name: 'users',
    columns: [
      { name: 'id',    type: 'INTEGER', nullable: false, isPrimaryKey: true,  isForeignKey: false, isIndexed: true },
      { name: 'email', type: 'VARCHAR', nullable: false, isPrimaryKey: false, isForeignKey: false, isIndexed: true },
      { name: 'name',  type: 'VARCHAR', nullable: true,  isPrimaryKey: false, isForeignKey: false, isIndexed: false },
    ],
    indexes: ['id', 'email'],
  },
  orders: {
    name: 'orders',
    columns: [
      { name: 'id',      type: 'INTEGER', nullable: false, isPrimaryKey: true,  isForeignKey: false, isIndexed: true  },
      { name: 'user_id', type: 'INTEGER', nullable: false, isPrimaryKey: false, isForeignKey: true,  isIndexed: false },
      { name: 'total',   type: 'DECIMAL', nullable: false, isPrimaryKey: false, isForeignKey: false, isIndexed: false },
    ],
    indexes: ['id'],
  },
}

describe('validateAgainstSchema', () => {
  it('flags a column that does not exist in the schema', () => {
    const result = parseSQL('SELECT u.nonexistent_col FROM users u', 'postgresql')
    const issues = validateAgainstSchema(result.rawAst, SCHEMA)
    expect(issues.some(i => i.severity === 'error' && i.title.toLowerCase().includes('nonexistent_col'))).toBe(true)
  })

  it('does not flag valid columns', () => {
    const result = parseSQL('SELECT u.id, u.email FROM users u', 'postgresql')
    const issues = validateAgainstSchema(result.rawAst, SCHEMA)
    const errors = issues.filter(i => i.severity === 'error')
    expect(errors).toHaveLength(0)
  })

  it('warns about JOIN on non-indexed column', () => {
    const result = parseSQL(
      'SELECT o.total FROM orders o JOIN users u ON o.user_id = u.id',
      'postgresql',
    )
    const issues = validateAgainstSchema(result.rawAst, SCHEMA)
    // user_id has no index in SCHEMA → warning
    expect(issues.some(i => i.severity === 'warning' && i.description.toLowerCase().includes('index'))).toBe(true)
  })

  it('returns empty array when schema is null', () => {
    const result = parseSQL('SELECT id FROM users', 'postgresql')
    const issues = validateAgainstSchema(result.rawAst, null)
    expect(issues).toEqual([])
  })
})
