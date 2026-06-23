// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { SuggestionsPanel } from '@/components/panels/SuggestionsPanel'
import type { Suggestion } from '@/types'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@/lib/optimizer/rewriter', () => ({
  canRewrite: (id: string) => id === 'replace_select_star',
  applyRewrite: (sql: string, id: string) =>
    id === 'replace_select_star' ? sql.replace(/SELECT \*/gi, 'SELECT -- TODO: specify columns') : sql,
}))

const mockSetQuery    = vi.fn()
const mockUndoRewrite = vi.fn()

const storeState = {
  suggestions:   [] as Suggestion[],
  query:         'SELECT * FROM users',
  previousQuery: null as string | null,
}

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (sel: (s: object) => unknown) =>
    sel({
      suggestions:   storeState.suggestions,
      query:         storeState.query,
      setQuery:      mockSetQuery,
      undoRewrite:   mockUndoRewrite,
      previousQuery: storeState.previousQuery,
    }),
}))

// ── Fixtures ───────────────────────────────────────────────────────────────────

const REWRITABLE: Suggestion = {
  id:       'replace_select_star',
  title:    'Avoid SELECT *',
  reason:   'Fetching all columns is inefficient.',
  impact:   'high',
  category: 'rewrite',
  before:   'SELECT * FROM users',
  after:    'SELECT id, name FROM users',
}

const NON_REWRITABLE: Suggestion = {
  id:       'add_index_users_email',
  title:    'Add index on users.email',
  reason:   'Speeds up lookups.',
  impact:   'medium',
  category: 'index',
  before:   '-- no index',
  after:    'CREATE INDEX idx_users_email ON users(email);',
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  storeState.suggestions   = []
  storeState.query         = 'SELECT * FROM users'
  storeState.previousQuery = null
  vi.clearAllMocks()
})

afterEach(cleanup)

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SuggestionsPanel — estado vacío', () => {
  it('muestra el mensaje vacío cuando no hay sugerencias', () => {
    render(<SuggestionsPanel />)
    expect(screen.getByText(/no suggestions yet/i)).toBeDefined()
  })

  it('no renderiza cards cuando suggestions está vacío', () => {
    render(<SuggestionsPanel />)
    expect(screen.queryByText('Avoid SELECT *')).toBeNull()
  })
})

describe('SuggestionsPanel — renderizado de cards', () => {
  it('renderiza el título de cada sugerencia', () => {
    storeState.suggestions = [REWRITABLE, NON_REWRITABLE]
    render(<SuggestionsPanel />)
    expect(screen.getByText('Avoid SELECT *')).toBeDefined()
    expect(screen.getByText('Add index on users.email')).toBeDefined()
  })

  it('renderiza el badge de impacto', () => {
    storeState.suggestions = [REWRITABLE]
    render(<SuggestionsPanel />)
    expect(screen.getByText('high')).toBeDefined()
  })

  it('renderiza el bloque before/after', () => {
    storeState.suggestions = [REWRITABLE]
    render(<SuggestionsPanel />)
    expect(screen.getByText('SELECT * FROM users')).toBeDefined()
    expect(screen.getByText('SELECT id, name FROM users')).toBeDefined()
  })
})

describe('SuggestionsPanel — botón Apply', () => {
  it('muestra Apply solo en sugerencias reescribibles', () => {
    storeState.suggestions = [REWRITABLE, NON_REWRITABLE]
    render(<SuggestionsPanel />)
    const applyBtns = screen.getAllByRole('button', { name: /apply suggestion/i })
    expect(applyBtns).toHaveLength(1)
    expect(applyBtns[0].getAttribute('aria-label')).toContain('Avoid SELECT *')
  })

  it('llama setQuery con el SQL reescrito al clicar Apply', () => {
    storeState.suggestions = [REWRITABLE]
    render(<SuggestionsPanel />)
    fireEvent.click(screen.getByRole('button', { name: /apply suggestion: avoid select \*/i }))
    expect(mockSetQuery).toHaveBeenCalledWith('SELECT -- TODO: specify columns FROM users')
  })

  it('no muestra Apply en sugerencias no reescribibles', () => {
    storeState.suggestions = [NON_REWRITABLE]
    render(<SuggestionsPanel />)
    expect(screen.queryByRole('button', { name: /apply suggestion/i })).toBeNull()
  })
})

describe('SuggestionsPanel — banner Undo', () => {
  it('no muestra el banner Undo cuando previousQuery es null', () => {
    storeState.suggestions   = [REWRITABLE]
    storeState.previousQuery = null
    render(<SuggestionsPanel />)
    expect(screen.queryByText(/undo last apply/i)).toBeNull()
  })

  it('muestra el banner Undo cuando previousQuery tiene valor', () => {
    storeState.suggestions   = [REWRITABLE]
    storeState.previousQuery = 'SELECT * FROM users'
    render(<SuggestionsPanel />)
    expect(screen.getByText(/undo last apply/i)).toBeDefined()
  })

  it('llama undoRewrite al clicar el banner Undo', () => {
    storeState.suggestions   = [REWRITABLE]
    storeState.previousQuery = 'SELECT * FROM users'
    render(<SuggestionsPanel />)
    fireEvent.click(screen.getByText(/undo last apply/i))
    expect(mockUndoRewrite).toHaveBeenCalledOnce()
  })
})
