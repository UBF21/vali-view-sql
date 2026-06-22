import { describe, it, expect } from 'vitest'
import { dialectAdapter } from '@/lib/parser/dialect-adapter'

// ─── PostgreSQL ───────────────────────────────────────────────────────────────
describe('dialectAdapter — postgresql', () => {
  it('strips RETURNING clause', () => {
    const sql = `INSERT INTO users (name) VALUES ('Ana') RETURNING id, name`
    expect(dialectAdapter(sql, 'postgresql')).not.toMatch(/RETURNING/i)
  })

  it('strips FILTER (WHERE ...) from aggregates', () => {
    const sql = `SELECT COUNT(*) FILTER (WHERE active = true) AS cnt FROM users`
    const out = dialectAdapter(sql, 'postgresql')
    expect(out).not.toMatch(/FILTER/i)
    expect(out).toMatch(/COUNT\(\*\)/)
  })

  it('strips ON CONFLICT DO UPDATE clause', () => {
    const sql = `INSERT INTO products (id, price) VALUES (1, 9.99) ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price`
    const out = dialectAdapter(sql, 'postgresql')
    expect(out).not.toMatch(/ON\s+CONFLICT/i)
    expect(out).toMatch(/INSERT INTO products/i)
  })

  it('strips ON CONFLICT DO NOTHING clause', () => {
    const sql = `INSERT INTO tags (name) VALUES ('sql') ON CONFLICT DO NOTHING`
    expect(dialectAdapter(sql, 'postgresql')).not.toMatch(/ON\s+CONFLICT/i)
  })

  it('removes LATERAL keyword', () => {
    const sql = `SELECT * FROM users u, LATERAL (SELECT * FROM orders WHERE user_id = u.id) o`
    expect(dialectAdapter(sql, 'postgresql')).not.toMatch(/\bLATERAL\b/i)
  })

  it('leaves regular SELECT unchanged', () => {
    const sql = `SELECT id, name FROM users WHERE active = true`
    expect(dialectAdapter(sql, 'postgresql')).toBe(sql)
  })
})

// ─── SQL Server ───────────────────────────────────────────────────────────────
describe('dialectAdapter — sqlserver', () => {
  it('removes WITH (NOLOCK) hint', () => {
    expect(dialectAdapter(`SELECT * FROM orders o WITH (NOLOCK)`, 'sqlserver')).not.toMatch(/NOLOCK/i)
  })

  it('unwraps bracket identifiers', () => {
    const out = dialectAdapter(`SELECT [name] FROM [employees]`, 'sqlserver')
    expect(out).toMatch(/SELECT name FROM employees/)
  })

  it('replaces ISNULL with COALESCE', () => {
    const out = dialectAdapter(`SELECT ISNULL(value, 0) FROM t`, 'sqlserver')
    expect(out).toMatch(/COALESCE/i)
    expect(out).not.toMatch(/ISNULL/i)
  })

  it('replaces TRY_CAST with CAST', () => {
    const out = dialectAdapter(`SELECT TRY_CAST(val AS decimal(10,2)) FROM t`, 'sqlserver')
    expect(out).toMatch(/\bCAST\b/i)
    expect(out).not.toMatch(/TRY_CAST/i)
  })

  it('replaces TRY_CONVERT with CONVERT', () => {
    const out = dialectAdapter(`SELECT TRY_CONVERT(int, val) FROM t`, 'sqlserver')
    expect(out).toMatch(/\bCONVERT\b/i)
    expect(out).not.toMatch(/TRY_CONVERT/i)
  })

  it('converts #temp to tmp_temp', () => {
    const out = dialectAdapter(`SELECT * FROM #top_customers`, 'sqlserver')
    expect(out).toMatch(/tmp_top_customers/)
    expect(out).not.toMatch(/#/)
  })

  it('strips SELECT TOP N', () => {
    expect(dialectAdapter(`SELECT TOP 10 id FROM orders`, 'sqlserver')).not.toMatch(/TOP\s+\d+/i)
  })

  it('replaces GETDATE() with NOW()', () => {
    const out = dialectAdapter(`SELECT * FROM o WHERE dt > GETDATE()`, 'sqlserver')
    expect(out).toMatch(/NOW\(\)/i)
    expect(out).not.toMatch(/GETDATE/i)
  })

  it('transforms OFFSET FETCH to LIMIT OFFSET', () => {
    const sql = `SELECT id FROM customers ORDER BY name OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY`
    const out = dialectAdapter(sql, 'sqlserver')
    expect(out).toMatch(/LIMIT 10 OFFSET 20/i)
    expect(out).not.toMatch(/FETCH/i)
  })

  it('strips FOR XML clause', () => {
    const sql = `SELECT id, name FROM users FOR XML PATH('user'), ROOT('users')`
    expect(dialectAdapter(sql, 'sqlserver')).not.toMatch(/FOR\s+XML/i)
  })

  it('strips FOR JSON clause', () => {
    const sql = `SELECT id, name FROM users FOR JSON PATH`
    expect(dialectAdapter(sql, 'sqlserver')).not.toMatch(/FOR\s+JSON/i)
  })

  it('strips OPTION hints', () => {
    const sql = `SELECT * FROM orders OPTION (MAXDOP 4, RECOMPILE)`
    expect(dialectAdapter(sql, 'sqlserver')).not.toMatch(/OPTION/i)
  })

  it('replaces WITH RECURSIVE with WITH', () => {
    expect(dialectAdapter(`WITH RECURSIVE cte AS (SELECT 1)`, 'sqlserver')).not.toMatch(/RECURSIVE/)
  })
})

// ─── MySQL ────────────────────────────────────────────────────────────────────
describe('dialectAdapter — mysql', () => {
  it('replaces backtick identifiers with double-quoted', () => {
    const out = dialectAdapter('SELECT `name` FROM `users`', 'mysql')
    expect(out).toMatch(/"name"/)
    expect(out).toMatch(/"users"/)
    expect(out).not.toMatch(/`/)
  })

  it('replaces IFNULL with COALESCE', () => {
    const out = dialectAdapter(`SELECT IFNULL(value, 0) FROM t`, 'mysql')
    expect(out).toMatch(/COALESCE/i)
    expect(out).not.toMatch(/IFNULL/i)
  })

  it('replaces STRAIGHT_JOIN with JOIN', () => {
    const out = dialectAdapter(`SELECT * FROM a STRAIGHT_JOIN b ON a.id = b.a_id`, 'mysql')
    expect(out).toMatch(/\bJOIN\b/)
    expect(out).not.toMatch(/STRAIGHT_JOIN/)
  })

  it('strips USE INDEX hints', () => {
    const out = dialectAdapter(`SELECT * FROM orders USE INDEX (idx_status) WHERE status = 1`, 'mysql')
    expect(out).not.toMatch(/USE\s+INDEX/i)
  })

  it('strips FORCE INDEX hints', () => {
    const out = dialectAdapter(`SELECT * FROM orders FORCE INDEX (PRIMARY) WHERE id > 0`, 'mysql')
    expect(out).not.toMatch(/FORCE\s+INDEX/i)
  })

  it('normalizes REPLACE INTO to INSERT INTO', () => {
    const out = dialectAdapter(`REPLACE INTO cache (k, v) VALUES (1, 2)`, 'mysql')
    expect(out).toMatch(/INSERT INTO/i)
    expect(out).not.toMatch(/REPLACE INTO/i)
  })

  it('normalizes INSERT IGNORE INTO to INSERT INTO', () => {
    const out = dialectAdapter(`INSERT IGNORE INTO logs (msg) VALUES ('test')`, 'mysql')
    expect(out).toMatch(/INSERT INTO/i)
    expect(out).not.toMatch(/IGNORE/i)
  })

  it('strips SQL_CALC_FOUND_ROWS', () => {
    const out = dialectAdapter(`SELECT SQL_CALC_FOUND_ROWS id FROM users LIMIT 10`, 'mysql')
    expect(out).not.toMatch(/SQL_CALC_FOUND_ROWS/i)
  })

  it('leaves standard SELECT unchanged', () => {
    const sql = `SELECT id, name FROM orders WHERE total > 100`
    expect(dialectAdapter(sql, 'mysql')).toBe(sql)
  })
})
