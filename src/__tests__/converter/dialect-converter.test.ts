import { describe, it, expect } from 'vitest'
import { convertDialect } from '@/lib/converter/dialect-converter'

describe('convertDialect — PostgreSQL → SQL Server', () => {
  it('converts LIMIT n to TOP n', () => {
    const { convertedSQL } = convertDialect(
      'SELECT id FROM users LIMIT 10',
      'postgresql', 'sqlserver',
    )
    expect(convertedSQL).toMatch(/SELECT\s+TOP\s+10/i)
    expect(convertedSQL).not.toMatch(/LIMIT/i)
  })

  it('converts LIMIT n OFFSET m to OFFSET FETCH', () => {
    const { convertedSQL } = convertDialect(
      'SELECT id FROM users LIMIT 10 OFFSET 20',
      'postgresql', 'sqlserver',
    )
    expect(convertedSQL).toMatch(/OFFSET\s+20\s+ROWS/i)
    expect(convertedSQL).toMatch(/FETCH\s+NEXT\s+10\s+ROWS\s+ONLY/i)
  })

  it('converts ILIKE to LIKE', () => {
    const { convertedSQL } = convertDialect(
      "SELECT id FROM users WHERE name ILIKE '%john%'",
      'postgresql', 'sqlserver',
    )
    expect(convertedSQL).not.toMatch(/ILIKE/i)
    expect(convertedSQL).toMatch(/LIKE/i)
  })

  it('records each change applied', () => {
    const { changes } = convertDialect('SELECT id FROM users LIMIT 5', 'postgresql', 'sqlserver')
    expect(changes.length).toBeGreaterThan(0)
    expect(changes[0]).toHaveProperty('rule')
    expect(changes[0]).toHaveProperty('original')
    expect(changes[0]).toHaveProperty('replaced')
  })
})

describe('convertDialect — SQL Server → PostgreSQL', () => {
  it('converts TOP n to LIMIT n', () => {
    const { convertedSQL } = convertDialect(
      'SELECT TOP 10 id FROM users',
      'sqlserver', 'postgresql',
    )
    expect(convertedSQL).toMatch(/LIMIT\s+10/i)
    expect(convertedSQL).not.toMatch(/\bTOP\b/i)
  })

  it('removes WITH(NOLOCK)', () => {
    const { convertedSQL } = convertDialect(
      'SELECT id FROM orders WITH(NOLOCK)',
      'sqlserver', 'postgresql',
    )
    expect(convertedSQL).not.toMatch(/NOLOCK/i)
  })
})

describe('convertDialect — same dialect', () => {
  it('returns original SQL unchanged', () => {
    const sql = 'SELECT id FROM users'
    const { convertedSQL, changes } = convertDialect(sql, 'postgresql', 'postgresql')
    expect(convertedSQL).toBe(sql)
    expect(changes).toHaveLength(0)
  })
})
