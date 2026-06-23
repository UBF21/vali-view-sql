import { describe, it, expect } from 'vitest'
import { parseSchema } from '@/lib/schema/schema-parser'

const SIMPLE_DDL = `
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
`

describe('parseSchema', () => {
  it('parses table names', () => {
    const schema = parseSchema(SIMPLE_DDL)
    expect(schema).toHaveProperty('users')
    expect(schema).toHaveProperty('orders')
  })

  it('parses column names', () => {
    const schema = parseSchema(SIMPLE_DDL)
    const cols = schema['users']?.columns.map(c => c.name)
    expect(cols).toContain('id')
    expect(cols).toContain('email')
    expect(cols).toContain('name')
  })

  it('detects primary keys', () => {
    const schema = parseSchema(SIMPLE_DDL)
    const idCol = schema['users']?.columns.find(c => c.name === 'id')
    expect(idCol?.isPrimaryKey).toBe(true)
  })

  it('detects NOT NULL', () => {
    const schema = parseSchema(SIMPLE_DDL)
    const nameCol = schema['users']?.columns.find(c => c.name === 'name')
    expect(nameCol?.nullable).toBe(true)  // name has no NOT NULL
    const emailCol = schema['users']?.columns.find(c => c.name === 'email')
    expect(emailCol?.nullable).toBe(false)
  })

  it('detects foreign keys', () => {
    const schema = parseSchema(SIMPLE_DDL)
    const userIdCol = schema['orders']?.columns.find(c => c.name === 'user_id')
    expect(userIdCol?.isForeignKey).toBe(true)
    expect(userIdCol?.references?.table).toBe('users')
  })

  it('detects CREATE INDEX', () => {
    const schema = parseSchema(SIMPLE_DDL)
    expect(schema['orders']?.indexes).toContain('user_id')
  })

  it('returns empty object for empty input', () => {
    expect(parseSchema('')).toEqual({})
    expect(parseSchema('   ')).toEqual({})
  })
})
