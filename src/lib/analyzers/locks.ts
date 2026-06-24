import type { Issue, Dialect } from '@/types'

let _counter = 0

export function detectLocks(sql: string, dialect: Dialect): Issue[] {
  _counter = 0
  if (dialect !== 'sqlserver') return []
  const issues: Issue[] = []

  const nolockMatch = /WITH\s*\(\s*NOLOCK\s*\)/i.exec(sql)
  if (nolockMatch) {
    issues.push({
      id: `lock-${_counter++}`,
      severity: 'info',
      title: 'NOLOCK hint detected',
      description: 'WITH (NOLOCK) allows dirty reads — uncommitted data that may be rolled back.',
      suggestion: 'Use NOLOCK only for reporting queries where stale data is acceptable. Avoid in transactional contexts.',
      dialectNote: 'SQL Server only',
      line: sql.substring(0, nolockMatch.index).split('\n').length,
    })
  }

  const holdlockMatch = /WITH\s*\(\s*HOLDLOCK\s*\)/i.exec(sql)
  if (holdlockMatch) {
    issues.push({
      id: `lock-${_counter++}`,
      severity: 'warning',
      title: 'HOLDLOCK hint detected',
      description: 'WITH (HOLDLOCK) holds shared locks until transaction end and can cause deadlocks.',
      suggestion: 'Ensure HOLDLOCK is intentional and that transactions are kept short to minimize deadlock risk.',
      dialectNote: 'SQL Server only',
      line: sql.substring(0, holdlockMatch.index).split('\n').length,
    })
  }

  return issues
}
