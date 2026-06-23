import type { Dialect } from '@/types'

export interface ConversionChange {
  rule:     string
  original: string
  replaced: string
}

export interface ConversionResult {
  convertedSQL: string
  changes:      ConversionChange[]
}

type ReplaceFn = (...args: string[]) => string

type ConversionRule = {
  id:      string
  match:   RegExp
  replace: string | ReplaceFn
  note:    string
}

// ── PostgreSQL → SQL Server ────────────────────────────────────────────────

const PG_TO_MSSQL: ConversionRule[] = [
  // Must run BEFORE simple LIMIT rule
  {
    id: 'pg-limit-offset-to-fetch',
    match: /\bLIMIT\s+(\d+)\s+OFFSET\s+(\d+)\b/gi,
    replace: (_m: string, limit: string, offset: string) =>
      `OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`,
    note: 'LIMIT n OFFSET m → OFFSET m ROWS FETCH NEXT n ROWS ONLY',
  },
  // Two-step approach for LIMIT → TOP:
  // Step A: inject TOP after SELECT (capture the number)
  {
    id: 'pg-limit-inject-top',
    match: /\b(SELECT)\b/gi,
    replace: (_m: string, sel: string) => `${sel} /*__TOP_PENDING__*/`,
    note: 'Temporarily mark SELECT for TOP injection',
  },
  // Step B: resolve TOP and remove LIMIT
  {
    id: 'pg-limit-finalize-top',
    match: /SELECT\s+\/\*__TOP_PENDING__\*\/\s+([\s\S]*?)\bLIMIT\s+(\d+)\b/gi,
    replace: (_m: string, rest: string, n: string) => `SELECT TOP ${n} ${rest.trim()}`,
    note: 'LIMIT n → TOP n (moved to SELECT)',
  },
  // Clean up pending marker if no LIMIT was present
  {
    id: 'pg-limit-cleanup-marker',
    match: /\/\*__TOP_PENDING__\*\/\s*/g,
    replace: '',
    note: 'Remove TOP_PENDING marker if no LIMIT found',
  },
  {
    id: 'pg-ilike-to-like',
    match: /\bILIKE\b/gi,
    replace: 'LIKE',
    note: 'ILIKE → LIKE',
  },
  {
    id: 'pg-cast-shorthand',
    match: /(\w+)::(\w+)/g,
    replace: (_m: string, val: string, type: string) => `CAST(${val} AS ${type})`,
    note: '::type cast → CAST(expr AS type)',
  },
  {
    id: 'pg-serial-to-identity',
    match: /\bSERIAL\b/gi,
    replace: 'INT IDENTITY(1,1)',
    note: 'SERIAL → INT IDENTITY(1,1)',
  },
]

// ── SQL Server → PostgreSQL ────────────────────────────────────────────────

const MSSQL_TO_PG: ConversionRule[] = [
  // Two-step approach for TOP → LIMIT:
  // Step A: capture n from SELECT TOP n, tag it
  {
    id: 'mssql-top-tag',
    match: /\bSELECT\s+TOP\s+(\d+)\b/gi,
    replace: (_m: string, n: string) => `SELECT /*__LIMIT__${n}__*/`,
    note: 'SELECT TOP n → SELECT (tag for LIMIT)',
  },
  // Step B: move the tagged LIMIT to end of query
  {
    id: 'mssql-top-finalize-limit',
    match: /\/\*__LIMIT__(\d+)__\*\/([\s\S]*)$/i,
    replace: (_m: string, n: string, rest: string) => `${rest.trimEnd()}\nLIMIT ${n}`,
    note: 'Finalize LIMIT placement at end of query',
  },
  {
    id: 'mssql-nolock-remove',
    match: /\bWITH\s*\(\s*NOLOCK\s*\)/gi,
    replace: '',
    note: 'WITH(NOLOCK) removed',
  },
  {
    id: 'mssql-bracket-to-quote',
    match: /\[(\w+)\]/g,
    replace: (_m: string, name: string) => `"${name}"`,
    note: '[bracket] → "double-quote" identifiers',
  },
  {
    id: 'mssql-isnull-to-coalesce',
    match: /\bISNULL\s*\(/gi,
    replace: 'COALESCE(',
    note: 'ISNULL() → COALESCE()',
  },
  {
    id: 'mssql-getdate-to-now',
    match: /\bGETDATE\s*\(\s*\)/gi,
    replace: 'NOW()',
    note: 'GETDATE() → NOW()',
  },
]

// ── PostgreSQL → MySQL ─────────────────────────────────────────────────────

const PG_TO_MYSQL: ConversionRule[] = [
  {
    id: 'pg-ilike-to-like-mysql',
    match: /\bILIKE\b/gi,
    replace: 'LIKE',
    note: 'ILIKE → LIKE (MySQL LIKE is case-insensitive by default)',
  },
  {
    id: 'pg-doublequote-to-backtick',
    match: /"(\w+)"/g,
    replace: (_m: string, name: string) => '`' + name + '`',
    note: '"double-quote" identifiers → `backtick`',
  },
  {
    id: 'pg-serial-to-auto',
    match: /\bSERIAL\b/gi,
    replace: 'INT AUTO_INCREMENT',
    note: 'SERIAL → INT AUTO_INCREMENT',
  },
]

// ── MySQL → PostgreSQL ─────────────────────────────────────────────────────

const MYSQL_TO_PG: ConversionRule[] = [
  {
    id: 'mysql-backtick-to-quote',
    match: /`(\w+)`/g,
    replace: (_m: string, name: string) => `"${name}"`,
    note: '`backtick` → "double-quote" identifiers',
  },
  {
    id: 'mysql-limit-offset-shorthand',
    match: /\bLIMIT\s+(\d+)\s*,\s*(\d+)\b/g,
    replace: (_m: string, offset: string, limit: string) => `LIMIT ${limit} OFFSET ${offset}`,
    note: 'LIMIT offset, count → LIMIT count OFFSET offset',
  },
  {
    id: 'mysql-auto-increment',
    match: /\bAUTO_INCREMENT\b/gi,
    replace: 'SERIAL',
    note: 'AUTO_INCREMENT → SERIAL',
  },
  {
    id: 'mysql-ifnull-to-coalesce',
    match: /\bIFNULL\s*\(/gi,
    replace: 'COALESCE(',
    note: 'IFNULL() → COALESCE()',
  },
]

// ── SQL Server → MySQL ─────────────────────────────────────────────────────

const MSSQL_TO_MYSQL: ConversionRule[] = [
  {
    id: 'mssql-bracket-to-backtick',
    match: /\[(\w+)\]/g,
    replace: (_m: string, name: string) => '`' + name + '`',
    note: '[bracket] → `backtick` identifiers',
  },
  {
    id: 'mssql-nolock-remove-mysql',
    match: /\bWITH\s*\(\s*NOLOCK\s*\)/gi,
    replace: '',
    note: 'WITH(NOLOCK) removed',
  },
  {
    id: 'mssql-getdate-to-now-mysql',
    match: /\bGETDATE\s*\(\s*\)/gi,
    replace: 'NOW()',
    note: 'GETDATE() → NOW()',
  },
]

// ── MySQL → SQL Server ─────────────────────────────────────────────────────

const MYSQL_TO_MSSQL: ConversionRule[] = [
  {
    id: 'mysql-backtick-to-bracket',
    match: /`(\w+)`/g,
    replace: (_m: string, name: string) => `[${name}]`,
    note: '`backtick` → [bracket] identifiers',
  },
  {
    id: 'mysql-auto-increment-to-identity',
    match: /\bAUTO_INCREMENT\b/gi,
    replace: 'IDENTITY(1,1)',
    note: 'AUTO_INCREMENT → IDENTITY(1,1)',
  },
]

// ── SQLite → PostgreSQL ────────────────────────────────────────────────────

const SQLITE_TO_PG: ConversionRule[] = [
  {
    id: 'sqlite-autoincrement',
    match: /\bAUTOINCREMENT\b/gi,
    replace: '',
    note: 'AUTOINCREMENT → (removed; use SERIAL in column definition)',
  },
]

// ── Rule registry ──────────────────────────────────────────────────────────

type ConversionKey = `${Dialect}→${Dialect}`

const RULES: Partial<Record<ConversionKey, ConversionRule[]>> = {
  'postgresql→sqlserver': PG_TO_MSSQL,
  'sqlserver→postgresql': MSSQL_TO_PG,
  'postgresql→mysql':     PG_TO_MYSQL,
  'mysql→postgresql':     MYSQL_TO_PG,
  'sqlserver→mysql':      MSSQL_TO_MYSQL,
  'mysql→sqlserver':      MYSQL_TO_MSSQL,
  'sqlite→postgresql':    SQLITE_TO_PG,
}

// ── Public API ─────────────────────────────────────────────────────────────

export function convertDialect(sql: string, from: Dialect, to: Dialect): ConversionResult {
  if (from === to) return { convertedSQL: sql, changes: [] }

  const rules = RULES[`${from}→${to}` as ConversionKey] ?? []
  const changes: ConversionChange[] = []
  let result = sql

  for (const rule of rules) {
    const before = result
    result = result.replace(rule.match, (...args: string[]) => {
      const replaced =
        typeof rule.replace === 'function'
          ? (rule.replace as ReplaceFn)(...args)
          : rule.replace
      return replaced
    })
    if (result !== before) {
      changes.push({ rule: rule.note, original: before, replaced: result })
    }
  }

  return { convertedSQL: result, changes }
}
