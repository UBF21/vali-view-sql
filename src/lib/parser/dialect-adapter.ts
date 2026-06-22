import type { Dialect } from '@/types'

function adaptPostgres(sql: string): string {
  return sql
    .replace(/\s*\bRETURNING\b[\s\S]*?(?=;|$)/gi, '')
    .replace(/\bFILTER\s*\(\s*WHERE\b[^)]*\)/gi, '')
    .replace(/\s*\bON\s+CONFLICT\b[\s\S]*?(?=;|$)/gi, '')
    .replace(/\bLATERAL\b/gi, '')
}

function adaptSqlServer(sql: string): string {
  return sql
    .replace(/\bWITH\s+RECURSIVE\b/gi, 'WITH')
    .replace(/\bWITH\s*\(\s*NOLOCK\s*\)/gi, '')
    .replace(/\[(\w+)\]/g, '$1')
    .replace(/\bISNULL\b/gi, 'COALESCE')
    .replace(/\bTRY_CAST\b/gi, 'CAST')
    .replace(/\bTRY_CONVERT\b/gi, 'CONVERT')
    .replace(/#(\w+)/g, 'tmp_$1')
    .replace(/\bSELECT\s+TOP\s+(\d+)\b/gi, 'SELECT')
    .replace(/\bGETDATE\s*\(\s*\)/gi, 'NOW()')
    .replace(/\bOFFSET\s+(\d+)\s+ROWS?\s+FETCH\s+(?:NEXT|FIRST)\s+(\d+)\s+ROWS?\s+ONLY\b/gi, 'LIMIT $2 OFFSET $1')
    .replace(/\bFOR\s+(?:XML|JSON)\b[\s\S]*?(?=;|$)/gi, '')
    .replace(/\bOPTION\s*\([^)]*\)/gi, '')
    .replace(
      /\bDATEADD\s*\(\s*\w+\s*,\s*(-?\d+)\s*,\s*(?:GETDATE\s*\(\s*\)|NOW\s*\(\s*\))\s*\)/gi,
      (_m, n) => `NOW() - INTERVAL '${Math.abs(+n)} days'`,
    )
}

function adaptMySQL(sql: string): string {
  return sql
    .replace(/`(\w+)`/g, '"$1"')
    .replace(/\bIFNULL\b/gi, 'COALESCE')
    .replace(/\bSTRAIGHT_JOIN\b/gi, 'JOIN')
    .replace(/\b(?:USE|FORCE|IGNORE)\s+INDEX\s*\([^)]*\)/gi, '')
    .replace(/\bREPLACE\s+INTO\b/gi, 'INSERT INTO')
    .replace(/\bINSERT\s+IGNORE\s+INTO\b/gi, 'INSERT INTO')
    .replace(/\bSQL_CALC_FOUND_ROWS\b/gi, '')
}

export function dialectAdapter(sql: string, dialect: Dialect): string {
  if (dialect === 'postgresql') return adaptPostgres(sql)
  if (dialect === 'sqlserver') return adaptSqlServer(sql)
  if (dialect === 'mysql') return adaptMySQL(sql)
  return sql
}
