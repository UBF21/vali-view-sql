import { describe, it, expect } from 'vitest'
import { applyRewrite, canRewrite } from '@/lib/optimizer/rewriter'

describe('canRewrite', () => {
  it('returns true for replace_select_star', () => {
    expect(canRewrite('replace_select_star')).toBe(true)
  })
  it('returns true for replace_cross_join', () => {
    expect(canRewrite('replace_cross_join')).toBe(true)
  })
  it('returns true for replace_nolock', () => {
    expect(canRewrite('replace_nolock')).toBe(true)
  })
  it('returns false for unknown key', () => {
    expect(canRewrite('suggest_index_on_col')).toBe(false)
  })
})

describe('applyRewrite', () => {
  it('replaces SELECT * with placeholder comment', () => {
    const result = applyRewrite('SELECT * FROM users', 'replace_select_star')
    expect(result).toContain('-- TODO: specify columns')
    expect(result).not.toContain('SELECT *')
  })

  it('removes WITH(NOLOCK) hints', () => {
    const result = applyRewrite(
      'SELECT id FROM orders WITH(NOLOCK) WHERE status = 1',
      'replace_nolock',
    )
    expect(result).not.toMatch(/WITH\s*\(\s*NOLOCK\s*\)/i)
  })

  it('replaces implicit cross join with INNER JOIN', () => {
    const result = applyRewrite(
      'SELECT * FROM orders o, users u WHERE o.user_id = u.id',
      'replace_cross_join',
    )
    expect(result).toContain('INNER JOIN')
  })

  it('returns original sql for non-rewritable key', () => {
    const sql = 'SELECT id FROM t'
    expect(applyRewrite(sql, 'suggest_index_on_col')).toBe(sql)
  })
})
