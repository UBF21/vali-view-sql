import type { Dialect } from '@/types'

export function dialectAdapter(sql: string, dialect: Dialect): string {
  if (dialect === 'sqlserver') {
    return sql
      .replace(/\bTOP\s+\d+\b/gi, '')
      .replace(/WITH\s*\(\s*NOLOCK\s*\)/gi, '')
      .replace(/\[(\w+)\]/g, '$1')
      .replace(/\bISNULL\b/gi, 'COALESCE')
      .replace(/#(\w+)/g, 'tmp_$1')
  }
  if (dialect === 'mysql') {
    return sql.replace(/`(\w+)`/g, '"$1"')
  }
  return sql
}
