import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Dialect, AppMode, ParseResult, Issue, Suggestion, NodeType } from '@/types'
import type { ComplexityResult } from '@/lib/complexity/complexity-score'

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
      infoNode: null,
      complexityResult: null,
      previousQuery: null,

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
      setInfoNode: (infoNode) => set({ infoNode }),
      setComplexityResult: (complexityResult) => set({ complexityResult }),
    }),
    {
      name: 'vali-viewsql-store',
      partialize: (state) => ({
        history: state.history,
        dialect: state.dialect,
        theme: state.theme,
      }),
    }
  )
)
