// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HistoryPicker } from '@/components/editor/HistoryPicker'

// createPortal renders inline so queries work normally in jsdom
vi.mock('react-dom', async (importActual) => {
  const actual = await importActual<typeof import('react-dom')>()
  return { ...actual, createPortal: (node: React.ReactNode) => node }
})

const mockSetQuery = vi.fn()
const mockSetDialect = vi.fn()
const mockClearHistory = vi.fn()

const ENTRIES = [
  { query: 'SELECT * FROM users', dialect: 'postgresql', timestamp: 1700000000000 },
  { query: 'SELECT id FROM orders', dialect: 'mysql', timestamp: 1700003600000 },
]

// Mutable state so each test can control what the store returns
const storeState = { history: ENTRIES as typeof ENTRIES }

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (sel: (s: object) => unknown) =>
    sel({ history: storeState.history, setQuery: mockSetQuery, setDialect: mockSetDialect, clearHistory: mockClearHistory }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  storeState.history = ENTRIES
})

describe('HistoryPicker', () => {
  it('renders nothing when history is empty', () => {
    storeState.history = []
    const { container } = render(<HistoryPicker />)
    expect(container.firstChild).toBeNull()
  })

  it('shows entry count on trigger button', () => {
    render(<HistoryPicker />)
    expect(screen.getByRole('button', { name: /view query history/i }).textContent).toContain('2')
  })

  it('trigger starts with aria-expanded false', () => {
    render(<HistoryPicker />)
    expect(screen.getByRole('button', { name: /view query history/i }).getAttribute('aria-expanded')).toBe('false')
  })

  it('opens dropdown with header and entries on click', () => {
    render(<HistoryPicker />)
    fireEvent.click(screen.getByRole('button', { name: /view query history/i }))
    expect(screen.getByText('Recent Queries')).toBeDefined()
    expect(screen.getByText(/SELECT \* FROM users/)).toBeDefined()
    expect(screen.getByText(/SELECT id FROM orders/)).toBeDefined()
  })

  it('trigger has aria-expanded true when open', () => {
    render(<HistoryPicker />)
    fireEvent.click(screen.getByRole('button', { name: /view query history/i }))
    expect(screen.getByRole('button', { name: /view query history/i }).getAttribute('aria-expanded')).toBe('true')
  })

  it('calls setQuery and setDialect when an entry is clicked', () => {
    render(<HistoryPicker />)
    fireEvent.click(screen.getByRole('button', { name: /view query history/i }))
    fireEvent.click(screen.getByText(/SELECT \* FROM users/))
    expect(mockSetQuery).toHaveBeenCalledWith('SELECT * FROM users')
    expect(mockSetDialect).toHaveBeenCalledWith('postgresql')
  })

  it('calls clearHistory when Clear is clicked', () => {
    render(<HistoryPicker />)
    fireEvent.click(screen.getByRole('button', { name: /view query history/i }))
    fireEvent.click(screen.getByRole('button', { name: /clear history/i }))
    expect(mockClearHistory).toHaveBeenCalled()
  })

  it('shows dialect abbreviation badges', () => {
    render(<HistoryPicker />)
    fireEvent.click(screen.getByRole('button', { name: /view query history/i }))
    expect(screen.getByText('PG')).toBeDefined()
    expect(screen.getByText('MY')).toBeDefined()
  })
})
