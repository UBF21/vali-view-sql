import type { Issue, Dialect } from '@/types'

let _counter = 0

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function detectDialectIssues(ast: any, sql: string, dialect: Dialect): Issue[] {
  _counter = 0
  const issues: Issue[] = []

  // MySQL-specific
  if (dialect === 'mysql') {
    // FULL OUTER JOIN — not supported in MySQL
    const hasFullJoin =
      Array.isArray(ast?.from) &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ast.from.some((f: any) => f?.join?.toLowerCase() === 'full join' || f?.join?.toLowerCase() === 'full outer join')
    if (hasFullJoin || /\bFULL\s+(?:OUTER\s+)?JOIN\b/i.test(sql)) {
      issues.push({
        id: `dialect-${_counter++}`,
        severity: 'error',
        title: 'FULL OUTER JOIN not supported in MySQL',
        description: 'MySQL does not support FULL OUTER JOIN natively.',
        suggestion: 'Emulate with LEFT JOIN UNION RIGHT JOIN: SELECT * FROM a LEFT JOIN b ON ... UNION SELECT * FROM a RIGHT JOIN b ON ...',
        dialectNote: 'MySQL',
      })
    }

    // GROUP BY without ONLY_FULL_GROUP_BY (non-aggregate column in SELECT)
    if (ast?.groupby && Array.isArray(ast?.columns)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const groupbyCols = (ast.groupby as any[]).map((g: any) => g?.column ?? g?.expr?.column)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nonGroupedCols = (ast.columns as any[]).filter((c: any) => {
        if (c?.expr?.type === 'aggr_func') return false  // aggregate — OK
        if (c?.expr?.type === 'star') return false
        const col = c?.expr?.column
        return col && !groupbyCols.includes(col)
      })
      if (nonGroupedCols.length > 0) {
        issues.push({
          id: `dialect-${_counter++}`,
          severity: 'warning',
          title: 'Non-aggregated column in SELECT with GROUP BY',
          description: 'MySQL may allow non-aggregated columns in SELECT with GROUP BY (depends on ONLY_FULL_GROUP_BY mode), but this is non-standard.',
          suggestion: 'Either add the column to GROUP BY or wrap it in an aggregate function like MAX() or ANY_VALUE().',
          dialectNote: 'MySQL ONLY_FULL_GROUP_BY',
        })
      }
    }
  }

  // SQL Server-specific
  if (dialect === 'sqlserver') {
    if (/\bLIMIT\b/i.test(sql)) {
      issues.push({
        id: `dialect-${_counter++}`,
        severity: 'error',
        title: 'LIMIT is not valid SQL Server syntax',
        description: 'SQL Server does not support LIMIT. Use TOP or FETCH NEXT instead.',
        suggestion: 'Replace LIMIT N with TOP N in SELECT, or use OFFSET 0 ROWS FETCH NEXT N ROWS ONLY.',
        dialectNote: 'SQL Server',
      })
    }
    if (/\bILIKE\b/i.test(sql)) {
      issues.push({
        id: `dialect-${_counter++}`,
        severity: 'error',
        title: 'ILIKE is not valid SQL Server syntax',
        description: 'SQL Server does not support ILIKE. Use LIKE with a case-insensitive collation instead.',
        suggestion: 'Use: WHERE col LIKE \'%value%\' COLLATE SQL_Latin1_General_CP1_CI_AS',
        dialectNote: 'SQL Server',
      })
    }
  }

  // PostgreSQL-specific
  if (dialect === 'postgresql') {
    if (/\bTOP\s+\d+\b/i.test(sql)) {
      issues.push({
        id: `dialect-${_counter++}`,
        severity: 'error',
        title: 'TOP is not valid PostgreSQL syntax',
        description: 'PostgreSQL does not support TOP N. Use LIMIT instead.',
        suggestion: 'Replace TOP N with LIMIT N at the end of the query.',
        dialectNote: 'PostgreSQL',
      })
    }
  }

  return issues
}
