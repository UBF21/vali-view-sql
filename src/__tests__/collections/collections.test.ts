import { describe, it, expect } from 'vitest'
import { migrateHistoryToCollections, addQueryToCollection, createCollection } from '@/lib/collections/helpers'
import type { Collection } from '@/lib/collections/types'

describe('migrateHistoryToCollections', () => {
  it('converts history entries to a Recent collection', () => {
    const history = [
      { query: 'SELECT 1', dialect: 'postgresql' as const, timestamp: 1000 },
      { query: 'SELECT 2', dialect: 'mysql' as const, timestamp: 2000 },
    ]
    const collections = migrateHistoryToCollections(history)
    expect(collections).toHaveLength(1)
    expect(collections[0].name).toBe('Recent')
    expect(collections[0].queries).toHaveLength(2)
    expect(collections[0].queries[0].sql).toBe('SELECT 1')
  })
})

describe('createCollection', () => {
  it('creates a collection with generated id', () => {
    const col = createCollection('My Queries')
    expect(col.name).toBe('My Queries')
    expect(col.id).toBeTruthy()
    expect(col.queries).toEqual([])
  })
})

describe('addQueryToCollection', () => {
  it('adds a query to a collection', () => {
    const col: Collection = { id: 'c1', name: 'Test', createdAt: '', queries: [] }
    const result = addQueryToCollection(col, { name: 'My query', sql: 'SELECT 1', dialect: 'postgresql', tags: [] })
    expect(result.queries).toHaveLength(1)
    expect(result.queries[0].name).toBe('My query')
    expect(result.queries[0].sql).toBe('SELECT 1')
    expect(result.queries[0].id).toBeTruthy()
  })

  it('enforces MAX_TOTAL_QUERIES limit', () => {
    let col: Collection = { id: 'c1', name: 'Big', createdAt: '', queries: [] }
    for (let i = 0; i < 201; i++) {
      col = addQueryToCollection(col, { name: `q${i}`, sql: `SELECT ${i}`, dialect: 'postgresql', tags: [] })
    }
    expect(col.queries.length).toBeLessThanOrEqual(200)
  })
})
