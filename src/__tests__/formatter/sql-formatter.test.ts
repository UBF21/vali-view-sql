import { describe, it, expect } from 'vitest'
import { formatSQL } from '@/lib/formatter/sql-formatter'

describe('formatSQL', () => {
  it('uppercases keywords and indents', () => {
    const result = formatSQL('select id,name from users where active=1', 'postgresql')
    expect(result).toMatch(/SELECT/)
    expect(result).toMatch(/FROM/)
    expect(result).toMatch(/WHERE/)
    expect(result).toContain('\n')
  })

  it('maps sqlserver dialect to tsql', () => {
    const result = formatSQL('select top 10 id from orders', 'sqlserver')
    expect(result).toMatch(/SELECT/)
    expect(result).toMatch(/TOP/)
  })

  it('handles sqlite dialect', () => {
    const result = formatSQL('select id from t limit 5', 'sqlite' as never)
    expect(result).toMatch(/SELECT/)
    expect(result).toMatch(/LIMIT/)
  })

  it('returns original sql on formatter error', () => {
    const broken = '((( not valid sql'
    const result = formatSQL(broken, 'postgresql')
    expect(result).toBe(broken)
  })
})
