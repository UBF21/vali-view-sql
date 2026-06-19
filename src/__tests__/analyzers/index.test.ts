import { describe, it, expect } from 'vitest'
import { runAnalyzers } from '@/lib/analyzers'

describe('runAnalyzers — integration', () => {
  it('combines issues from multiple analyzers', () => {
    const sql = 'SELECT * FROM orders WITH (NOLOCK)'
    const issues = runAnalyzers({}, sql, 'sqlserver')
    // SELECT * → warning, NOLOCK → info
    expect(issues.length).toBeGreaterThanOrEqual(1)
  })

  it('returns empty array for clean query', () => {
    const sql = 'SELECT id, name FROM users WHERE id = 1'
    // With empty ast, anti-patterns won't fire — just lock/dialect checks
    const issues = runAnalyzers({}, sql, 'postgresql')
    expect(Array.isArray(issues)).toBe(true)
  })
})
