import type { Collection, SavedQuery } from './types'
import { MAX_TOTAL_QUERIES } from './types'
import type { Dialect } from '@/types'

let _idCounter = 0
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${++_idCounter}`
}

export function createCollection(name: string, color?: string): Collection {
  return { id: generateId('col'), name, color, createdAt: new Date().toISOString(), queries: [] }
}

interface NewQueryInput {
  name:         string
  description?: string
  sql:          string
  dialect:      Dialect
  tags:         string[]
}

export function addQueryToCollection(collection: Collection, input: NewQueryInput): Collection {
  const query: SavedQuery = {
    id:          generateId('q'),
    name:        input.name,
    description: input.description,
    sql:         input.sql,
    dialect:     input.dialect,
    tags:        input.tags,
    savedAt:     new Date().toISOString(),
  }
  const updated = [query, ...collection.queries]
  if (updated.length > MAX_TOTAL_QUERIES) updated.splice(MAX_TOTAL_QUERIES)
  return { ...collection, queries: updated }
}

export function removeQueryFromCollection(collection: Collection, queryId: string): Collection {
  return { ...collection, queries: collection.queries.filter(q => q.id !== queryId) }
}

export function migrateHistoryToCollections(
  history: { query: string; dialect: Dialect; timestamp: number }[],
): Collection[] {
  if (history.length === 0) return []
  const recentCol: Collection = {
    id:        'col_recent_migrated',
    name:      'Recent',
    createdAt: new Date().toISOString(),
    queries:   history.map((h, i) => ({
      id:      `q_migrated_${i}`,
      name:    h.query.replace(/\s+/g, ' ').trim().substring(0, 40),
      sql:     h.query,
      dialect: h.dialect,
      tags:    [],
      savedAt: new Date(h.timestamp).toISOString(),
    })),
  }
  return [recentCol]
}
