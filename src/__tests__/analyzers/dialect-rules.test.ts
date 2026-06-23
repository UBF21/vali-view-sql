import { describe, it, expect } from 'vitest'
import { detectDialectIssues } from '@/lib/analyzers/dialect-rules'

describe('detectDialectIssues — SQL Server', () => {
  it('detects LIMIT in SQL Server', () => {
    const issues = detectDialectIssues({}, 'SELECT * FROM t LIMIT 10', 'sqlserver')
    expect(issues.some(i => i.title.includes('LIMIT'))).toBe(true)
    expect(issues.find(i => i.title.includes('LIMIT'))?.severity).toBe('error')
  })
  it('detects ILIKE in SQL Server', () => {
    const issues = detectDialectIssues({}, "SELECT * FROM t WHERE name ILIKE '%foo%'", 'sqlserver')
    expect(issues.some(i => i.title.includes('ILIKE'))).toBe(true)
  })
})

describe('detectDialectIssues — PostgreSQL', () => {
  it('detects TOP in PostgreSQL', () => {
    const issues = detectDialectIssues({}, 'SELECT TOP 10 * FROM users', 'postgresql')
    expect(issues.some(i => i.title.includes('TOP'))).toBe(true)
    expect(issues.find(i => i.title.includes('TOP'))?.severity).toBe('error')
  })
  it('no issue for valid PostgreSQL LIMIT', () => {
    const issues = detectDialectIssues({}, 'SELECT * FROM users LIMIT 10', 'postgresql')
    expect(issues.some(i => i.title.includes('LIMIT'))).toBe(false)
  })
})

describe('detectDialectIssues — MySQL FULL OUTER JOIN', () => {
  it('detects FULL OUTER JOIN in MySQL', () => {
    const issues = detectDialectIssues({}, 'SELECT * FROM a FULL OUTER JOIN b ON a.id = b.id', 'mysql')
    expect(issues.some(i => i.title.includes('FULL OUTER JOIN'))).toBe(true)
    expect(issues.find(i => i.title.includes('FULL OUTER JOIN'))?.severity).toBe('error')
  })
})

describe('SQLite dialect rules', () => {
  it('flags FULL OUTER JOIN as error', () => {
    const issues = detectDialectIssues({}, 'SELECT a FROM t1 FULL OUTER JOIN t2 ON t1.id = t2.id', 'sqlite')
    expect(issues.some(i => i.severity === 'error' && i.title.toLowerCase().includes('full outer'))).toBe(true)
  })

  it('flags RIGHT JOIN as warning', () => {
    const issues = detectDialectIssues({}, 'SELECT a FROM t1 RIGHT JOIN t2 ON t1.id = t2.id', 'sqlite')
    expect(issues.some(i => i.severity === 'warning' && i.title.toLowerCase().includes('right join'))).toBe(true)
  })

  it('flags TRUNCATE TABLE as error', () => {
    const issues = detectDialectIssues({}, 'TRUNCATE TABLE users', 'sqlite')
    expect(issues.some(i => i.severity === 'error' && i.title.toLowerCase().includes('truncate'))).toBe(true)
  })
})
