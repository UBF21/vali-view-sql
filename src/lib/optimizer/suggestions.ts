import type { Issue, Suggestion } from '@/types'

let _counter = 0

function makeSuggestion(
  category: Suggestion['category'],
  title: string,
  before: string,
  after: string,
  impact: Suggestion['impact'],
  reason: string
): Suggestion {
  return { id: `sug-${_counter++}`, category, title, before, after, impact, reason }
}

export function generateSuggestions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ast: any,
  issues: Issue[],
  sql: string
): Suggestion[] {
  _counter = 0
  const suggestions: Suggestion[] = []

  // SELECT * → suggest explicit columns
  if (issues.some(i => i.title.includes('SELECT *'))) {
    suggestions.push(makeSuggestion(
      'rewrite',
      'Replace SELECT * with explicit columns',
      'SELECT * FROM users',
      'SELECT id, name, email FROM users',
      'medium',
      'Explicit columns reduce network bandwidth and prevent breakage when the schema changes.'
    ))
  }

  // Cartesian product → suggest JOIN
  if (issues.some(i => i.title.includes('Cartesian'))) {
    suggestions.push(makeSuggestion(
      'rewrite',
      'Replace implicit cross-join with explicit JOIN',
      'SELECT a.id, b.name FROM users a, orders b',
      'SELECT a.id, b.name FROM users a JOIN orders b ON a.id = b.user_id',
      'high',
      'An explicit JOIN makes the relationship clear and avoids accidentally producing millions of rows.'
    ))
  }

  // Multiple subqueries → suggest CTEs
  if (issues.some(i => i.title.includes('Multiple subqueries'))) {
    suggestions.push(makeSuggestion(
      'rewrite',
      'Extract repeated subqueries into CTEs',
      'SELECT * FROM (SELECT ...) a JOIN (SELECT ...) b ON ...',
      'WITH cte_a AS (SELECT ...), cte_b AS (SELECT ...) SELECT * FROM cte_a JOIN cte_b ON ...',
      'medium',
      'CTEs improve readability and can be optimized better by some query planners.'
    ))
  }

  // LIKE leading wildcard → suggest full-text search
  if (issues.some(i => i.title.includes('leading wildcard'))) {
    suggestions.push(makeSuggestion(
      'performance',
      'Replace LIKE leading wildcard with full-text search',
      "WHERE name LIKE '%smith%'",
      "WHERE to_tsvector('english', name) @@ plainto_tsquery('smith') -- PostgreSQL\n-- OR: WHERE MATCH(name) AGAINST('smith') -- MySQL",
      'high',
      'Full-text indexes are orders of magnitude faster than leading-wildcard LIKE patterns.'
    ))
  }

  // NOLOCK → suggest READ COMMITTED SNAPSHOT
  if (issues.some(i => i.title.includes('NOLOCK'))) {
    suggestions.push(makeSuggestion(
      'dialect',
      'Replace NOLOCK with READ_COMMITTED_SNAPSHOT isolation',
      'SELECT * FROM orders WITH (NOLOCK)',
      'SELECT * FROM orders  -- Enable READ_COMMITTED_SNAPSHOT at DB level instead',
      'medium',
      'READ_COMMITTED_SNAPSHOT provides consistent reads without dirty reads, unlike NOLOCK.'
    ))
  }

  // UPDATE/DELETE without WHERE → no automatic rewrite, just note
  if (issues.some(i => i.title.includes('UPDATE without WHERE') || i.title.includes('DELETE without WHERE'))) {
    suggestions.push(makeSuggestion(
      'rewrite',
      'Add WHERE clause to avoid full-table modification',
      'UPDATE orders SET status = \'closed\'',
      'UPDATE orders SET status = \'closed\' WHERE created_at < \'2024-01-01\'',
      'high',
      'Without a WHERE clause, every row is affected. Always scope modifications to the intended rows.'
    ))
  }

  // Index suggestions — look for columns in WHERE with no apparent index
  if (ast?.where && ast?.from) {
    const whereCol = ast.where?.left?.column ?? ast.where?.column
    if (whereCol && typeof whereCol === 'string') {
      suggestions.push(makeSuggestion(
        'index',
        `Consider an index on ${whereCol}`,
        `SELECT ... FROM ${ast.from?.[0]?.table ?? 'table'} WHERE ${whereCol} = ?`,
        `CREATE INDEX idx_${ast.from?.[0]?.table ?? 'table'}_${whereCol} ON ${ast.from?.[0]?.table ?? 'table'} (${whereCol});`,
        'high',
        `Filtering by ${whereCol} without an index causes a full table scan.`
      ))
    }
  }

  void sql // reserved for future string-based heuristics

  return suggestions
}
