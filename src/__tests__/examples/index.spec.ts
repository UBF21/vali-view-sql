import { describe, it, expect } from 'vitest'
import { EXAMPLES, getExamplesByDialect } from '@/lib/examples/index'

describe('EXAMPLES catalog', () => {
  it('has at least 24 examples total', () => {
    expect(EXAMPLES.length).toBeGreaterThanOrEqual(24)
  })

  it('every example has required fields', () => {
    for (const ex of EXAMPLES) {
      expect(ex.id, `${ex.id} missing id`).toBeTruthy()
      expect(ex.title, `${ex.id} missing title`).toBeTruthy()
      expect(ex.dialect, `${ex.id} missing dialect`).toBeTruthy()
      expect(ex.sql, `${ex.id} missing sql`).toBeTruthy()
      expect(ex.category, `${ex.id} missing category`).toBeTruthy()
    }
  })

  it('example IDs are unique', () => {
    const ids = EXAMPLES.map(e => e.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('all dialects are one of the supported values', () => {
    const VALID = new Set(['postgresql', 'mysql', 'sqlserver'])
    for (const ex of EXAMPLES) {
      expect(VALID.has(ex.dialect), `${ex.id} has invalid dialect: ${ex.dialect}`).toBe(true)
    }
  })
})

describe('getExamplesByDialect', () => {
  it('returns only postgresql examples', () => {
    const pg = getExamplesByDialect('postgresql')
    expect(pg.length).toBeGreaterThanOrEqual(8)
    expect(pg.every(e => e.dialect === 'postgresql')).toBe(true)
  })

  it('returns only mysql examples', () => {
    const my = getExamplesByDialect('mysql')
    expect(my.length).toBeGreaterThanOrEqual(8)
    expect(my.every(e => e.dialect === 'mysql')).toBe(true)
  })

  it('returns only sqlserver examples', () => {
    const ss = getExamplesByDialect('sqlserver')
    expect(ss.length).toBeGreaterThanOrEqual(8)
    expect(ss.every(e => e.dialect === 'sqlserver')).toBe(true)
  })

  it('returns empty array for unknown dialect', () => {
    expect(getExamplesByDialect('oracle')).toHaveLength(0)
  })
})

describe('EXAMPLES — DML coverage', () => {
  it('includes at least one INSERT example', () => {
    const hasInsert = EXAMPLES.some(e => /INSERT/i.test(e.sql))
    expect(hasInsert).toBe(true)
  })

  it('includes at least one UPDATE example', () => {
    const hasUpdate = EXAMPLES.some(e => /^UPDATE/im.test(e.sql))
    expect(hasUpdate).toBe(true)
  })

  it('includes at least one DELETE example', () => {
    const hasDelete = EXAMPLES.some(e => /^DELETE/im.test(e.sql))
    expect(hasDelete).toBe(true)
  })

  it('includes at least one CTE example per dialect', () => {
    for (const dialect of ['postgresql', 'mysql', 'sqlserver'] as const) {
      const hasCtE = EXAMPLES.some(e => e.dialect === dialect && /^\s*WITH\b/im.test(e.sql))
      expect(hasCtE, `No CTE example for ${dialect}`).toBe(true)
    }
  })

  it('includes at least one JOIN example per dialect', () => {
    for (const dialect of ['postgresql', 'mysql', 'sqlserver'] as const) {
      const hasJoin = EXAMPLES.some(e => e.dialect === dialect && /\bJOIN\b/i.test(e.sql))
      expect(hasJoin, `No JOIN example for ${dialect}`).toBe(true)
    }
  })
})
