import { describe, it, expect } from 'vitest'
import { extractColumnLineage } from '@/lib/lineage/column-lineage'
import { parseSQL } from '@/lib/parser'

describe('extractColumnLineage', () => {
  it('extracts direct column references', () => {
    const result = parseSQL('SELECT u.id, u.name FROM users u', 'postgresql')
    expect(result).not.toBeNull()
    const lineage = extractColumnLineage(result!.rawAst)
    expect(lineage.length).toBeGreaterThan(0)
    const idEntry = lineage.find(e => e.outputAlias === 'id')
    expect(idEntry).toBeDefined()
    expect(idEntry!.sources[0].table).toBe('u')
    expect(idEntry!.sources[0].column).toBe('id')
  })

  it('handles column aliases', () => {
    const result = parseSQL('SELECT u.email AS user_email FROM users u', 'postgresql')
    const lineage = extractColumnLineage(result!.rawAst)
    const entry = lineage.find(e => e.outputAlias === 'user_email')
    expect(entry).toBeDefined()
    expect(entry!.sources[0].column).toBe('email')
  })

  it('handles SELECT *', () => {
    const result = parseSQL('SELECT * FROM users', 'postgresql')
    const lineage = extractColumnLineage(result!.rawAst)
    expect(lineage.some(e => e.sources[0]?.column === '*')).toBe(true)
  })

  it('handles aggregate expressions', () => {
    const result = parseSQL('SELECT COUNT(o.id) AS order_count FROM orders o', 'postgresql')
    const lineage = extractColumnLineage(result!.rawAst)
    const entry = lineage.find(e => e.outputAlias === 'order_count')
    expect(entry).toBeDefined()
    expect(entry!.expression).toBeDefined()
    expect(entry!.expression).toContain('COUNT')
  })

  it('returns empty array for non-SELECT statements', () => {
    const lineage = extractColumnLineage(null)
    expect(lineage).toEqual([])
  })
})
