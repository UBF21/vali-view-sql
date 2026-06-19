import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Dialect, AppMode, ParseResult, Issue, Suggestion } from '@/types'

interface HistoryEntry {
  query: string
  dialect: Dialect
  timestamp: number
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

  setDialect: (d: Dialect) => void
  setQuery: (q: string) => void
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

      setDialect: (dialect) => set({ dialect }),
      setQuery: (query) => set({ query }),
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
