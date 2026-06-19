import type { Issue, Dialect } from '@/types'
import { detectAntiPatterns } from './anti-patterns'
import { detectLocks } from './locks'
import { detectPerformanceIssues } from './performance'
import { detectDialectIssues } from './dialect-rules'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function runAnalyzers(ast: any, sql: string, dialect: Dialect): Issue[] {
  const issues: Issue[] = [
    ...detectAntiPatterns(ast),
    ...detectLocks(sql, dialect),
    ...detectPerformanceIssues(ast, sql),
    ...detectDialectIssues(ast, sql, dialect),
  ]
  return issues
}
