import { describe, it, expect } from 'vitest'
import { dialectAdapter } from '@/lib/parser/dialect-adapter'

describe('MERGE normalization', () => {
  it('preserves MERGE keyword through postgres adapter', () => {
    const sql = `MERGE INTO target USING source ON target.id = source.id
WHEN MATCHED THEN UPDATE SET name = source.name
WHEN NOT MATCHED THEN INSERT (id, name) VALUES (source.id, source.name)`
    const adapted = dialectAdapter(sql, 'postgresql')
    expect(adapted).toContain('MERGE')
    expect(adapted).toContain('WHEN MATCHED')
    expect(adapted).toContain('WHEN NOT MATCHED')
  })

  it('preserves PIVOT keyword through sqlserver adapter', () => {
    const sql = `SELECT * FROM orders PIVOT (SUM(amount) FOR month IN ([Jan],[Feb],[Mar])) AS pvt`
    const adapted = dialectAdapter(sql, 'sqlserver')
    expect(adapted).toContain('PIVOT')
  })

  it('preserves UNPIVOT keyword through sqlserver adapter', () => {
    const sql = `SELECT id, month, amount FROM orders UNPIVOT (amount FOR month IN (jan, feb, mar)) AS unpvt`
    const adapted = dialectAdapter(sql, 'sqlserver')
    expect(adapted).toContain('UNPIVOT')
  })
})
