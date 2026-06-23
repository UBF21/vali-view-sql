const REWRITABLE_KEYS = new Set([
  'replace_select_star',
  'replace_cross_join',
  'replace_nolock',
])

export function canRewrite(suggestionId: string): boolean {
  return REWRITABLE_KEYS.has(suggestionId)
}

export function applyRewrite(sql: string, suggestionId: string): string {
  switch (suggestionId) {
    case 'replace_select_star':
      return sql.replace(/SELECT\s+\*/gi, 'SELECT -- TODO: specify columns')

    case 'replace_nolock':
      return sql.replace(/\bWITH\s*\(\s*NOLOCK\s*\)/gi, '').replace(/\s{2,}/g, ' ').trim()

    case 'replace_cross_join': {
      const match = sql.match(
        /FROM\s+(\w+)\s+(\w+)?\s*,\s*(\w+)\s+(\w+)?\s+WHERE\s+([\w.]+)\s*=\s*([\w.]+)/i,
      )
      if (!match) return sql
      const [full, t1, a1, t2, a2, col1, col2] = match
      const alias1 = a1 ? ` ${a1}` : ''
      const alias2 = a2 ? ` ${a2}` : ''
      const replacement = `FROM ${t1}${alias1} INNER JOIN ${t2}${alias2} ON ${col1} = ${col2}`
      return sql.replace(full, replacement).replace(/WHERE\s+([\w.]+)\s*=\s*([\w.]+)\s*/i, '')
    }

    default:
      return sql
  }
}
