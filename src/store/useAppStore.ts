import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Dialect, AppMode, ParseResult, Issue, Suggestion, NodeType } from '@/types'
import type { ComplexityResult } from '@/lib/complexity/complexity-score'
import type { ColumnLineage } from '@/lib/lineage/column-lineage'
import type { Collection } from '@/lib/collections/types'
import { MAX_COLLECTIONS } from '@/lib/collections/types'
import { createCollection, addQueryToCollection, migrateHistoryToCollections } from '@/lib/collections/helpers'
import type { Schema } from '@/lib/schema/types'
import { parseSchema } from '@/lib/schema/schema-parser'

interface HistoryEntry {
  query: string
  dialect: Dialect
  timestamp: number
}

export interface InfoNodeData {
  nodeType: NodeType
  label: string
  detail: string
  clause?: string
}

interface AppStore {
  dialect: Dialect
  query: string
  queryB: string
  mode: AppMode
  theme: 'light' | 'dark'
  parseResult: ParseResult | null
  issues: Issue[]
  suggestions: Suggestion[]
  isLoading: boolean
  parseError: string | null
  history: HistoryEntry[]
  infoNode: InfoNodeData | null
  complexityResult: ComplexityResult | null
  previousQuery: string | null
  columnLineage: ColumnLineage
  setColumnLineage: (l: ColumnLineage) => void

  setDialect: (d: Dialect) => void
  setQuery: (q: string) => void
  undoRewrite: () => void
  setQueryB: (q: string) => void
  setMode: (m: AppMode) => void
  setTheme: (t: 'light' | 'dark') => void
  setParseResult: (r: ParseResult | null) => void
  setIssues: (i: Issue[]) => void
  setSuggestions: (s: Suggestion[]) => void
  setIsLoading: (v: boolean) => void
  setParseError: (e: string | null) => void
  addToHistory: (query: string, dialect: Dialect) => void
  clearHistory: () => void
  setInfoNode: (n: InfoNodeData | null) => void
  setComplexityResult: (r: ComplexityResult | null) => void

  collections:           Collection[]
  saveQueryToCollection: (collectionId: string, input: { name: string; description?: string; tags: string[] }) => void
  addCollection:         (name: string, color?: string) => void
  removeCollection:      (collectionId: string) => void
  renameCollection:      (collectionId: string, newName: string) => void

  schema:      Schema | null
  loadSchema:  (ddl: string) => void
  clearSchema: () => void

  zoomControls: { zoomIn: () => void; zoomOut: () => void; fitView: (opts?: { padding?: number }) => void } | null
  setZoomControls: (c: { zoomIn: () => void; zoomOut: () => void; fitView: (opts?: { padding?: number }) => void } | null) => void

  pendingSnippet: string | null
  setPendingSnippet: (sql: string) => void
  clearPendingSnippet: () => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      dialect: 'postgresql',
      query: '',
      queryB: '',
      mode: 'explain',
      theme: 'dark',
      parseResult: null,
      issues: [],
      suggestions: [],
      isLoading: false,
      parseError: null,
      history: [],
      collections: [],
      schema: null,
      loadSchema: (ddl) => set({ schema: parseSchema(ddl) }),
      clearSchema: () => set({ schema: null }),
      infoNode: null,
      complexityResult: null,
      previousQuery: null,
      columnLineage: [],
      setColumnLineage: (columnLineage) => set({ columnLineage }),

      setDialect: (dialect) => set({ dialect }),
      setQuery: (query) => set((state) => ({ query, previousQuery: state.query })),
      undoRewrite: () => set((state) =>
        state.previousQuery !== null
          ? { query: state.previousQuery, previousQuery: null }
          : {}
      ),
      setQueryB: (queryB) => set({ queryB }),
      setMode: (mode) => set({ mode }),
      setTheme: (theme) => set({ theme }),
      setParseResult: (parseResult) => set({ parseResult }),
      setIssues: (issues) => set({ issues }),
      setSuggestions: (suggestions) => set({ suggestions }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setParseError: (parseError) => set({ parseError }),
      addToHistory: (query, dialect) =>
        set((state) => ({
          history: [
            { query, dialect, timestamp: Date.now() },
            ...state.history.filter((h) => h.query !== query).slice(0, 9),
          ],
        })),
      clearHistory: () => set({ history: [] }),

      saveQueryToCollection: (collectionId, input) =>
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId
              ? addQueryToCollection(c, { ...input, sql: state.query, dialect: state.dialect })
              : c
          ),
        })),

      addCollection: (name, color) =>
        set((state) => {
          if (state.collections.length >= MAX_COLLECTIONS) return {}
          return { collections: [createCollection(name, color), ...state.collections] }
        }),

      removeCollection: (collectionId) =>
        set((state) => ({
          collections: state.collections.filter((c) => c.id !== collectionId),
        })),

      renameCollection: (collectionId, newName) =>
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId ? { ...c, name: newName } : c
          ),
        })),

      setInfoNode: (infoNode) => set({ infoNode }),
      setComplexityResult: (complexityResult) => set({ complexityResult }),

      zoomControls: null,
      setZoomControls: (zoomControls) => set({ zoomControls }),

      pendingSnippet: null,
      setPendingSnippet: (pendingSnippet) => set({ pendingSnippet }),
      clearPendingSnippet: () => set({ pendingSnippet: null }),
    }),
    {
      name: 'vali-viewsql-store',
      partialize: (state) => ({
        collections: state.collections,
        dialect:     state.dialect,
        theme:       state.theme,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        try {
          const raw = localStorage.getItem('vali-viewsql-store')
          if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed?.state?.history?.length > 0 && state.collections.length === 0) {
              state.collections = migrateHistoryToCollections(parsed.state.history)
            }
          }
        } catch { /* ignore */ }
      },
    }
  )
)
