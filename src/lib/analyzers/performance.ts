import type { Issue } from '@/types'

let _counter = 0

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function detectPerformanceIssues(ast: any, originalSql: string): Issue[] {
  _counter = 0
  const issues: Issue[] = []
  if (!ast || typeof ast !== 'object') return issues

  // 1. ORDER BY without LIMIT in subquery
  if (ast.orderby && !ast.limit) {
    // Check if this is inside a subquery context (heuristic: look for nested from)
    const isTopLevel = !originalSql.trim().toLowerCase().startsWith('select') ||
      !/\(\s*select/i.test(originalSql)
    if (!isTopLevel) {
      issues.push({
        id: `perf-${_counter++}`,
        severity: 'warning',
        title: 'ORDER BY without LIMIT in subquery',
        description: 'Sorting a subquery without a LIMIT is usually unnecessary and wastes resources.',
        suggestion: 'Remove ORDER BY from the subquery unless you also add LIMIT/TOP/FETCH NEXT.',
      })
    }
  }

  // 2. Multiple subqueries — suggest CTEs
  const subqueryCount = (() => {
    const str = JSON.stringify(ast)
    return (str.match(/"type":"select"/g) ?? []).length - 1  // subtract the main select
  })()
  if (subqueryCount >= 2) {
    issues.push({
      id: `perf-${_counter++}`,
      severity: 'info',
      title: 'Multiple subqueries detected',
      description: `Found ${subqueryCount} nested subqueries. Complex subqueries can hurt readability and sometimes performance.`,
      suggestion: 'Consider refactoring repeated subqueries into CTEs (WITH clauses) for better readability and potential optimization.',
    })
  }

  return issues
}
