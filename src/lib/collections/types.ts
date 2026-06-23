import type { Dialect } from '@/types'

export interface SavedQuery {
  id:           string
  name:         string
  description?: string
  sql:          string
  dialect:      Dialect
  tags:         string[]
  savedAt:      string
}

export interface Collection {
  id:        string
  name:      string
  color?:    string
  createdAt: string
  queries:   SavedQuery[]
}

export const MAX_COLLECTIONS   = 20
export const MAX_TOTAL_QUERIES = 200
