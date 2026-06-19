import { describe, it, expect } from 'vitest'
import { Parser } from 'node-sql-parser'
import { detectAntiPatterns } from '@/lib/analyzers/anti-patterns'

const parser = new Parser()
const parse = (sql: string) => {
  const ast = parser.astify(sql)
  return Array.isArray(ast) ? ast[0] : ast
}

describe('detectAntiPatterns — SELECT *', () => {
  it('detects SELECT *', () => {
    const issues = detectAntiPatterns(parse('SELECT * FROM users'))
    expect(issues.some(i => i.title.includes('SELECT *'))).toBe(true)
    expect(issues.find(i => i.title.includes('SELECT *'))?.severity).toBe('warning')
  })
  it('no issue for explicit columns', () => {
    const issues = detectAntiPatterns(parse('SELECT id, name FROM users'))
    expect(issues.some(i => i.title.includes('SELECT *'))).toBe(false)
  })
})

describe('detectAntiPatterns — cartesian product', () => {
  it('detects multiple tables without JOIN', () => {
    const issues = detectAntiPatterns(parse('SELECT a.id, b.name FROM users a, orders b'))
    expect(issues.some(i => i.title.includes('Cartesian'))).toBe(true)
    expect(issues.find(i => i.title.includes('Cartesian'))?.severity).toBe('error')
  })
  it('no issue for single table', () => {
    const issues = detectAntiPatterns(parse('SELECT id FROM users'))
    expect(issues.some(i => i.title.includes('Cartesian'))).toBe(false)
  })
})

describe('detectAntiPatterns — HAVING without GROUP BY', () => {
  it('detects HAVING without GROUP BY', () => {
    const issues = detectAntiPatterns(parse('SELECT id FROM orders HAVING COUNT(*) > 1'))
    expect(issues.some(i => i.title.includes('HAVING'))).toBe(true)
    expect(issues.find(i => i.title.includes('HAVING'))?.severity).toBe('error')
  })
})

describe('detectAntiPatterns — DISTINCT with GROUP BY', () => {
  it('detects DISTINCT + GROUP BY', () => {
    const issues = detectAntiPatterns(parse('SELECT DISTINCT status FROM orders GROUP BY status'))
    expect(issues.some(i => i.title.includes('DISTINCT'))).toBe(true)
    expect(issues.find(i => i.title.includes('DISTINCT'))?.severity).toBe('info')
  })
})
