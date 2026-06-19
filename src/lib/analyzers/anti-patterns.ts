import type { Issue } from '@/types'

let _issueCounter = 0
const makeIssue = (
  severity: Issue['severity'],
  title: string,
  description: string,
  suggestion: string,
  nodeId?: string
): Issue => ({
  id: `ap-${_issueCounter++}`,
  severity,
  title,
  description,
  suggestion,
  nodeId,
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function detectAntiPatterns(ast: any): Issue[] {
  _issueCounter = 0
  const issues: Issue[] = []
  if (!ast || typeof ast !== 'object') return issues

  // 1. SELECT *
  if (
    ast.columns === '*' ||
    (Array.isArray(ast.columns) &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ast.columns.some((c: any) =>
        c?.expr?.type === 'star' ||
        c === '*' ||
        (c?.expr?.type === 'column_ref' && c?.expr?.column === '*')
      ))
  ) {
    issues.push(makeIssue(
      'warning',
      'SELECT * detected',
      'Selecting all columns increases network traffic and can break applications when schema changes.',
      'Specify only the columns you need: SELECT id, name, email FROM ...'
    ))
  }

  // 2. Cartesian product (multiple tables in FROM without JOIN)
  const fromTables = Array.isArray(ast.from)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? ast.from.filter((f: any) => f && !f.join && !f.expr)
    : []
  if (fromTables.length > 1 && (!ast.join || ast.join.length === 0)) {
    issues.push(makeIssue(
      'error',
      'Cartesian product risk',
      `${fromTables.length} tables in FROM without explicit JOIN will produce a cartesian product.`,
      'Use explicit JOIN syntax: FROM tableA JOIN tableB ON tableA.id = tableB.foreign_id'
    ))
  }

  // 3. N+1 potential — subquery in SELECT columns
  if (Array.isArray(ast.columns)) {
    const hasCorrelatedSubquery = ast.columns.some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any) => c?.expr?.type === 'select' || c?.expr?.ast?.type === 'select'
    )
    if (hasCorrelatedSubquery) {
      issues.push(makeIssue(
        'warning',
        'N+1 query potential',
        'A subquery in SELECT columns can execute once per row in the result set.',
        'Consider rewriting as a JOIN or using a CTE to precompute the subquery result.'
      ))
    }
  }

  // 4. UPDATE without WHERE
  if (ast.type === 'update' && !ast.where) {
    issues.push(makeIssue(
      'error',
      'UPDATE without WHERE',
      'This UPDATE will modify ALL rows in the table.',
      'Add a WHERE clause to target specific rows: UPDATE table SET col = val WHERE id = ?'
    ))
  }

  // 5. DELETE without WHERE
  if (ast.type === 'delete' && !ast.where) {
    issues.push(makeIssue(
      'error',
      'DELETE without WHERE',
      'This DELETE will remove ALL rows from the table.',
      'Add a WHERE clause or use TRUNCATE TABLE if you intend to remove all rows.'
    ))
  }

  // 6. HAVING without GROUP BY
  if (ast.having && !ast.groupby) {
    issues.push(makeIssue(
      'error',
      'HAVING without GROUP BY',
      'HAVING filters grouped results but there is no GROUP BY clause.',
      'Add GROUP BY or replace HAVING with WHERE for row-level filtering.'
    ))
  }

  // 7. OR in JOIN condition
  const hasOrInJoin =
    Array.isArray(ast.from) &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ast.from.some((f: any) => {
      const cond = f?.on
      return cond && JSON.stringify(cond).includes('"OR"')
    })
  if (hasOrInJoin) {
    issues.push(makeIssue(
      'warning',
      'OR in JOIN condition',
      'OR in a JOIN ON clause prevents index usage and can cause full scans.',
      'Consider splitting into separate JOINs or using UNION to combine results.'
    ))
  }

  // 8. Function on WHERE column
  if (ast.where) {
    const hasFuncOnCol =
      ast.where?.left?.type === 'function' ||
      (ast.where?.type === 'binary_expr' && ast.where?.left?.type === 'function')
    if (hasFuncOnCol) {
      issues.push(makeIssue(
        'warning',
        'Function on WHERE column',
        'Applying a function to a column in WHERE prevents index usage on that column.',
        'If possible, rewrite to avoid wrapping the column: WHERE col >= func(val) instead of WHERE func(col) >= val'
      ))
    }
  }

  // 9. LIKE with leading wildcard
  if (ast.where) {
    const likePattern = ast.where?.right?.value ?? ''
    if (typeof likePattern === 'string' && likePattern.startsWith('%')) {
      issues.push(makeIssue(
        'warning',
        'LIKE with leading wildcard',
        `LIKE '${likePattern}' cannot use an index and causes a full table scan.`,
        'Consider full-text search (MATCH/AGAINST in MySQL, tsvector in PostgreSQL) for pattern matching.'
      ))
    }
  }

  // 10. DISTINCT with GROUP BY
  if (ast.distinct === 'DISTINCT' && ast.groupby) {
    issues.push(makeIssue(
      'info',
      'DISTINCT with GROUP BY',
      'Using DISTINCT with GROUP BY is redundant — GROUP BY already deduplicates within groups.',
      'Remove DISTINCT if GROUP BY already produces the distinct rows you need.'
    ))
  }

  return issues
}
