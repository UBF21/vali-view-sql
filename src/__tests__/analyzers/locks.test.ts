import { describe, it, expect } from 'vitest'
import { detectLocks } from '@/lib/analyzers/locks'

describe('detectLocks', () => {
  it('detects NOLOCK in SQL Server', () => {
    const issues = detectLocks('SELECT * FROM orders WITH (NOLOCK)', 'sqlserver')
    expect(issues.some(i => i.title.includes('NOLOCK'))).toBe(true)
    expect(issues[0].severity).toBe('info')
  })
  it('detects HOLDLOCK in SQL Server', () => {
    const issues = detectLocks('SELECT * FROM orders WITH (HOLDLOCK)', 'sqlserver')
    expect(issues.some(i => i.title.includes('HOLDLOCK'))).toBe(true)
    expect(issues[0].severity).toBe('warning')
  })
  it('ignores NOLOCK for non-SQL Server dialects', () => {
    const issues = detectLocks('SELECT * FROM orders WITH (NOLOCK)', 'postgresql')
    expect(issues).toHaveLength(0)
  })
})
