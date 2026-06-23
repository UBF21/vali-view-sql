import type { Issue, Dialect } from '@/types'
import type { Schema } from '@/lib/schema/types'
import { detectAntiPatterns } from './anti-patterns'
import { detectLocks } from './locks'
import { detectPerformanceIssues } from './performance'
import { detectDialectIssues } from './dialect-rules'
import { validateAgainstSchema } from './schema-validator'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function runAnalyzers(ast: any, sql: string, dialect: Dialect, schema: Schema | null = null): Issue[] {
  const issues: Issue[] = [
    ...detectAntiPatterns(ast),
    ...detectLocks(sql, dialect),
    ...detectPerformanceIssues(ast, sql),
    ...detectDialectIssues(ast, sql, dialect),
    ...validateAgainstSchema(ast, schema),
  ]
  return issues
}
