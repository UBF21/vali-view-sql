import { describe, it, expect } from 'vitest'
import { dialectAdapter } from '@/lib/parser/dialect-adapter'

describe('dialectAdapter', () => {
  describe('postgresql (passthrough)', () => {
    it('returns SQL unchanged for postgresql', () => {
      const sql = 'SELECT id FROM users WHERE id = 1'
      expect(dialectAdapter(sql, 'postgresql')).toBe(sql)
    })
  })

  describe('mysql', () => {
    it('converts backtick identifiers to double quotes', () => {
      const result = dialectAdapter('SELECT `id` FROM `users`', 'mysql')
      expect(result).toBe('SELECT "id" FROM "users"')
    })

    it('leaves non-backtick SQL unchanged', () => {
      const sql = 'SELECT id FROM users'
      expect(dialectAdapter(sql, 'mysql')).toBe(sql)
    })
  })

  describe('sqlserver', () => {
    it('removes TOP N clause', () => {
      const result = dialectAdapter('SELECT TOP 10 id FROM users', 'sqlserver')
      expect(result).not.toContain('TOP')
      expect(result).toContain('SELECT')
    })

    it('removes WITH (NOLOCK) table hints', () => {
      const result = dialectAdapter('SELECT id FROM users WITH (NOLOCK)', 'sqlserver')
      expect(result).not.toContain('NOLOCK')
    })

    it('removes bracket identifiers', () => {
      const result = dialectAdapter('SELECT [id] FROM [users]', 'sqlserver')
      expect(result).toBe('SELECT id FROM users')
    })

    it('replaces ISNULL with COALESCE', () => {
      const result = dialectAdapter("SELECT ISNULL(name, 'N/A') FROM users", 'sqlserver')
      expect(result).toContain('COALESCE')
      expect(result).not.toContain('ISNULL')
    })

    it('replaces #temp with tmp_ prefix', () => {
      const result = dialectAdapter('SELECT id FROM #orders', 'sqlserver')
      expect(result).toContain('tmp_orders')
      expect(result).not.toContain('#orders')
    })
  })
})
