import { describe, it, expect } from 'vitest'
import { SNIPPETS } from '@/lib/snippets'
import type { Snippet } from '@/lib/snippets'

describe('SNIPPETS catalog', () => {
  it('has exactly 5 snippets', () => {
    expect(SNIPPETS).toHaveLength(5)
  })

  it('every snippet has required fields non-empty', () => {
    for (const s of SNIPPETS) {
      expect(s.id,          `${s.id} missing id`).toBeTruthy()
      expect(s.title,       `${s.id} missing title`).toBeTruthy()
      expect(s.description, `${s.id} missing description`).toBeTruthy()
      expect(s.sql,         `${s.id} missing sql`).toBeTruthy()
    }
  })

  it('snippet IDs are unique', () => {
    const ids = SNIPPETS.map((s: Snippet) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('each snippet SQL contains at least one SQL keyword', () => {
    const SQL_KW = /\b(SELECT|WITH|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN)\b/i
    for (const s of SNIPPETS) {
      expect(SQL_KW.test(s.sql), `${s.id}: sql has no recognizable keyword`).toBe(true)
    }
  })

  it('includes a JOIN snippet', () => {
    expect(SNIPPETS.some(s => /\bJOIN\b/i.test(s.sql))).toBe(true)
  })

  it('includes a CTE (WITH) snippet', () => {
    expect(SNIPPETS.some(s => /^\s*WITH\b/im.test(s.sql))).toBe(true)
  })

  it('includes a window function snippet', () => {
    expect(SNIPPETS.some(s => /\bOVER\s*\(/i.test(s.sql))).toBe(true)
  })

  it('includes a GROUP BY snippet', () => {
    expect(SNIPPETS.some(s => /\bGROUP\s+BY\b/i.test(s.sql))).toBe(true)
  })
})
