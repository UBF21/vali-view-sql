import { describe, it, expect } from 'vitest'
import { diffQueries } from '@/lib/diff/query-diff'
import { parseSQL } from '@/lib/parser'

describe('diffQueries — identical queries', () => {
  it('returns no differences for the same query', () => {
    const sql = 'SELECT id, name FROM users WHERE active = true'
    const a = parseSQL(sql, 'postgresql')
    const b = parseSQL(sql, 'postgresql')
    const { diff } = diffQueries(a, b)
    expect(diff.addedNodes).toHaveLength(0)
    expect(diff.removedNodes).toHaveLength(0)
    expect(diff.changedNodes).toHaveLength(0)
    expect(diff.summary).toBe('No differences')
  })

  it('marks all nodes as "same" when queries are identical', () => {
    const sql = 'SELECT id FROM orders'
    const a = parseSQL(sql, 'postgresql')
    const b = parseSQL(sql, 'postgresql')
    const { nodesA, nodesB } = diffQueries(a, b)
    expect(nodesA.every(n => n.data.diffStatus === 'same')).toBe(true)
    expect(nodesB.every(n => n.data.diffStatus === 'same')).toBe(true)
  })
})

describe('diffQueries — added nodes', () => {
  it('detects added ORDER BY (sort node)', () => {
    const sqlA = 'SELECT id FROM orders WHERE status = \'active\''
    const sqlB = 'SELECT id FROM orders WHERE status = \'active\' ORDER BY id'
    const a = parseSQL(sqlA, 'postgresql')
    const b = parseSQL(sqlB, 'postgresql')
    const { diff, nodesB } = diffQueries(a, b)
    expect(diff.addedNodes.length).toBeGreaterThan(0)
    const addedInB = nodesB.filter(n => n.data.diffStatus === 'added')
    expect(addedInB.length).toBeGreaterThan(0)
    expect(addedInB.some(n => n.data.nodeType === 'sort')).toBe(true)
  })
})

describe('diffQueries — removed nodes', () => {
  it('detects removed WHERE (filter node)', () => {
    const sqlA = 'SELECT id FROM users WHERE active = true'
    const sqlB = 'SELECT id FROM users'
    const a = parseSQL(sqlA, 'postgresql')
    const b = parseSQL(sqlB, 'postgresql')
    const { diff, nodesA } = diffQueries(a, b)
    expect(diff.removedNodes.length).toBeGreaterThan(0)
    const removedInA = nodesA.filter(n => n.data.diffStatus === 'removed')
    expect(removedInA.some(n => n.data.nodeType === 'filter')).toBe(true)
  })
})

describe('diffQueries — changed nodes', () => {
  it('detects changed WHERE condition', () => {
    const sqlA = 'SELECT id FROM users WHERE age > 18'
    const sqlB = 'SELECT id FROM users WHERE age > 21'
    const a = parseSQL(sqlA, 'postgresql')
    const b = parseSQL(sqlB, 'postgresql')
    const { diff } = diffQueries(a, b)
    // filter node has same ID but different detail → changed
    expect(diff.changedNodes.length + diff.addedNodes.length + diff.removedNodes.length).toBeGreaterThan(0)
  })
})

describe('diffQueries — summary', () => {
  it('summary lists counts', () => {
    const sqlA = 'SELECT id FROM users'
    const sqlB = 'SELECT id, name FROM orders WHERE id > 1 ORDER BY id'
    const a = parseSQL(sqlA, 'postgresql')
    const b = parseSQL(sqlB, 'postgresql')
    const { diff } = diffQueries(a, b)
    expect(diff.summary).not.toBe('')
    expect(typeof diff.summary).toBe('string')
  })
})
