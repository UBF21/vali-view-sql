import { describe, it, expect } from 'vitest'
import { highlightSQL, highlightSQLWithClause } from './sql-highlight'

// ── highlightSQL ──────────────────────────────────────────────────────────────

describe('highlightSQL', () => {
  it('wraps SQL keywords in sq-keyword spans', () => {
    const out = highlightSQL('SELECT * FROM users')
    expect(out).toContain('<span class="sq-keyword">SELECT</span>')
    expect(out).toContain('<span class="sq-keyword">FROM</span>')
  })

  it('wraps SQL functions in sq-function spans', () => {
    const out = highlightSQL('SELECT COUNT(id) FROM t')
    expect(out).toContain('<span class="sq-function">COUNT</span>')
  })

  it('wraps string literals in sq-string spans', () => {
    const out = highlightSQL("WHERE name = 'alice'")
    expect(out).toContain('<span class="sq-string">\'alice\'</span>')
  })

  it('wraps numeric literals in sq-number spans', () => {
    const out = highlightSQL('LIMIT 10')
    expect(out).toContain('<span class="sq-number">10</span>')
  })

  it('wraps single-line comments in sq-comment spans', () => {
    const out = highlightSQL('-- this is a comment\nSELECT 1')
    expect(out).toContain('<span class="sq-comment">-- this is a comment</span>')
  })

  it('wraps block comments in sq-comment spans', () => {
    const out = highlightSQL('/* block */ SELECT 1')
    expect(out).toContain('<span class="sq-comment">/* block */</span>')
  })

  it('does not highlight keywords inside string literals', () => {
    const out = highlightSQL("SELECT 'SELECT FROM WHERE'")
    // The inner text is inside a string span, not a keyword span
    expect(out).not.toMatch(/<span class="sq-keyword">FROM<\/span>/)
    expect(out).toContain('<span class="sq-string">\'SELECT FROM WHERE\'</span>')
  })

  it('escapes HTML special characters', () => {
    const out = highlightSQL('a < b AND b > c')
    expect(out).toContain('&lt;')
    expect(out).toContain('&gt;')
  })

  it('always appends a trailing newline', () => {
    expect(highlightSQL('SELECT 1')).toMatch(/\n$/)
    expect(highlightSQL('SELECT 1\n')).toMatch(/\n$/)
  })

  it('handles empty string without throwing', () => {
    expect(() => highlightSQL('')).not.toThrow()
    expect(highlightSQL('')).toBe('\n')
  })
})

// ── highlightSQLWithClause ────────────────────────────────────────────────────

describe('highlightSQLWithClause', () => {
  const sql = 'SELECT id\nFROM users\nWHERE active = 1'

  it('returns plain highlighted SQL when no clause provided', () => {
    const withClause = highlightSQLWithClause(sql)
    const plain      = highlightSQL(sql)
    expect(withClause).toBe(plain)
  })

  it('wraps matching clause line in sq-clause-highlight mark', () => {
    const out = highlightSQLWithClause(sql, 'WHERE')
    expect(out).toContain('<mark class="sq-clause-highlight">')
    expect(out).toContain('active')
  })

  it('falls back to plain highlight when clause not found', () => {
    const out = highlightSQLWithClause(sql, 'HAVING')
    expect(out).toBe(highlightSQL(sql))
  })

  it('handles exact multi-word clause match', () => {
    const out = highlightSQLWithClause(sql, 'FROM users')
    expect(out).toContain('<mark class="sq-clause-highlight">')
  })

  it('handles JOIN disambiguation via table hint', () => {
    const joinSql = 'SELECT *\nFROM orders\nINNER JOIN users ON users.id = orders.user_id'
    const out = highlightSQLWithClause(joinSql, 'INNER JOIN users')
    expect(out).toContain('<mark class="sq-clause-highlight">')
  })
})
