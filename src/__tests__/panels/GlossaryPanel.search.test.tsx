// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@/store/useAppStore', () => ({ useAppStore: vi.fn() }))

import { useAppStore } from '@/store/useAppStore'
import { GlossaryPanel } from '@/components/panels/GlossaryPanel'

const GLOSSARY = [
  { keyword: 'SELECT', role: 'Clause', detail: 'Retrieves columns from tables', lineRef: 1 },
  { keyword: 'FROM',   role: 'Clause', detail: 'Specifies the source table',    lineRef: 1 },
  { keyword: 'WHERE',  role: 'Filter', detail: 'Filters rows by condition',      lineRef: 2 },
]

function mountPanel() {
  vi.mocked(useAppStore).mockImplementation((sel: (s: unknown) => unknown) =>
    sel({ parseResult: { glossary: GLOSSARY } })
  )
  return render(<GlossaryPanel />)
}

describe('GlossaryPanel search', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders search input when glossary is non-empty', () => {
    mountPanel()
    expect(screen.getByRole('textbox', { name: /filter glossary/i })).toBeTruthy()
  })

  it('shows all entries when search is empty', () => {
    mountPanel()
    expect(screen.getByText('SELECT')).toBeTruthy()
    expect(screen.getByText('FROM')).toBeTruthy()
    expect(screen.getByText('WHERE')).toBeTruthy()
  })

  it('filters by keyword', () => {
    mountPanel()
    fireEvent.change(screen.getByRole('textbox', { name: /filter glossary/i }), { target: { value: 'sel' } })
    expect(screen.getByText('SELECT')).toBeTruthy()
    expect(screen.queryByText('FROM')).toBeNull()
    expect(screen.queryByText('WHERE')).toBeNull()
  })

  it('filters by role (case-insensitive)', () => {
    mountPanel()
    fireEvent.change(screen.getByRole('textbox', { name: /filter glossary/i }), { target: { value: 'filter' } })
    expect(screen.getByText('WHERE')).toBeTruthy()
    expect(screen.queryByText('SELECT')).toBeNull()
  })

  it('filters by detail text', () => {
    mountPanel()
    fireEvent.change(screen.getByRole('textbox', { name: /filter glossary/i }), { target: { value: 'source table' } })
    expect(screen.getByText('FROM')).toBeTruthy()
    expect(screen.queryByText('SELECT')).toBeNull()
  })

  it('shows empty state when no results', () => {
    mountPanel()
    fireEvent.change(screen.getByRole('textbox', { name: /filter glossary/i }), { target: { value: 'xyz-not-found' } })
    expect(screen.getByText(/no keywords match/i)).toBeTruthy()
  })

  it('shows parse prompt when glossary is empty', () => {
    vi.mocked(useAppStore).mockImplementation((sel: (s: unknown) => unknown) =>
      sel({ parseResult: null })
    )
    render(<GlossaryPanel />)
    expect(screen.getByText(/parse a sql query/i)).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})
