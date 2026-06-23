import { describe, it, expect } from 'vitest'
import { generateReportHTML } from '@/lib/report/report-generator'
import type { Issue, Suggestion } from '@/types'
import type { ColumnLineage } from '@/lib/lineage/column-lineage'
import type { ComplexityResult } from '@/lib/complexity/complexity-score'

const MOCK_COMPLEXITY: ComplexityResult = {
  score: 5,
  level: 'Moderate',
  breakdown: { tableCount: 2, joinCount: 1, subqueryCount: 0, cteCount: 0, setOpCount: 0, procedureCount: 0, aggregateCount: 1, conditionCount: 0, loopCount: 0 },
}

const MOCK_ISSUES: Issue[] = [
  { id: 'i1', severity: 'error', title: 'SELECT *', description: 'Avoid SELECT *', suggestion: 'Specify columns' },
]

const MOCK_SUGGESTIONS: Suggestion[] = [
  { id: 's1', category: 'rewrite', title: 'Replace SELECT *', before: 'SELECT *', after: 'SELECT id, name', impact: 'high', reason: 'Better performance' },
]

const MOCK_LINEAGE: ColumnLineage = [
  { outputAlias: 'id', sources: [{ table: 'users', column: 'id' }] },
]

describe('generateReportHTML', () => {
  it('returns a non-empty HTML string', () => {
    const html = generateReportHTML({
      sql: 'SELECT * FROM users',
      dialect: 'postgresql',
      diagramDataUrl: null,
      complexity: MOCK_COMPLEXITY,
      issues: MOCK_ISSUES,
      suggestions: MOCK_SUGGESTIONS,
      lineage: MOCK_LINEAGE,
    })
    expect(html).toBeTruthy()
    expect(html).toContain('<html')
    expect(html).toContain('</html>')
  })

  it('includes the SQL in the output', () => {
    const html = generateReportHTML({
      sql: 'SELECT id FROM users',
      dialect: 'postgresql',
      diagramDataUrl: null,
      complexity: MOCK_COMPLEXITY,
      issues: [],
      suggestions: [],
      lineage: [],
    })
    expect(html).toContain('SELECT id FROM users')
  })

  it('includes issues section when issues present', () => {
    const html = generateReportHTML({
      sql: 'SELECT * FROM users',
      dialect: 'postgresql',
      diagramDataUrl: null,
      complexity: MOCK_COMPLEXITY,
      issues: MOCK_ISSUES,
      suggestions: [],
      lineage: [],
    })
    expect(html).toContain('SELECT *')
    expect(html).toContain('Avoid SELECT *')
  })

  it('includes lineage section when lineage present', () => {
    const html = generateReportHTML({
      sql: 'SELECT id FROM users',
      dialect: 'postgresql',
      diagramDataUrl: null,
      complexity: MOCK_COMPLEXITY,
      issues: [],
      suggestions: [],
      lineage: MOCK_LINEAGE,
    })
    expect(html).toContain('users')
  })

  it('skips diagram section when diagramDataUrl is null', () => {
    const html = generateReportHTML({
      sql: 'SELECT 1',
      dialect: 'postgresql',
      diagramDataUrl: null,
      complexity: MOCK_COMPLEXITY,
      issues: [],
      suggestions: [],
      lineage: [],
    })
    expect(html).not.toContain('<img')
  })
})
