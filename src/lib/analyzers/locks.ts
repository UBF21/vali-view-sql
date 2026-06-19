import type { Issue, Dialect } from '@/types'

let _counter = 0

export function detectLocks(sql: string, dialect: Dialect): Issue[] {
  _counter = 0
  if (dialect !== 'sqlserver') return []
  const issues: Issue[] = []

  if (/WITH\s*\(\s*NOLOCK\s*\)/i.test(sql)) {
    issues.push({
      id: `lock-${_counter++}`,
      severity: 'info',
      title: 'NOLOCK hint detected',
      description: 'WITH (NOLOCK) allows dirty reads — uncommitted data that may be rolled back.',
      suggestion: 'Use NOLOCK only for reporting queries where stale data is acceptable. Avoid in transactional contexts.',
      dialectNote: 'SQL Server only',
    })
  }

  if (/WITH\s*\(\s*HOLDLOCK\s*\)/i.test(sql)) {
    issues.push({
      id: `lock-${_counter++}`,
      severity: 'warning',
      title: 'HOLDLOCK hint detected',
      description: 'WITH (HOLDLOCK) holds shared locks until transaction end and can cause deadlocks.',
      suggestion: 'Ensure HOLDLOCK is intentional and that transactions are kept short to minimize deadlock risk.',
      dialectNote: 'SQL Server only',
    })
  }

  return issues
}
