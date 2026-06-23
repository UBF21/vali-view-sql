import { format } from 'sql-formatter'
import type { Dialect } from '@/types'

const DIALECT_MAP: Record<string, string> = {
  postgresql: 'postgresql',
  mysql:      'mysql',
  sqlserver:  'tsql',
  sqlite:     'sqlite',
}

export function formatSQL(sql: string, dialect: Dialect | string): string {
  try {
    return format(sql, {
      language:    (DIALECT_MAP[dialect] ?? 'sql') as Parameters<typeof format>[1]['language'],
      keywordCase: 'upper',
      indentStyle: 'standard',
      tabWidth:    2,
    })
  } catch {
    return sql
  }
}
