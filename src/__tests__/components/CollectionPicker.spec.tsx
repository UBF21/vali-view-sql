// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CollectionPicker } from '@/components/editor/CollectionPicker'

vi.mock('react-dom', async (importActual) => {
  const actual = await importActual<typeof import('react-dom')>()
  return { ...actual, createPortal: (node: React.ReactNode) => node }
})

vi.mock('@/components/editor/SaveQueryForm', () => ({
  SaveQueryForm: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="save-query-form">
      <button onClick={onClose}>close-save</button>
    </div>
  ),
}))

const mockSetQuery   = vi.fn()
const mockSetDialect = vi.fn()
const mockRemoveCollection = vi.fn()

const COLLECTIONS = [
  {
    id: 'col_1',
    name: 'Favorites',
    queries: [
      { id: 'q1', name: 'Get users', sql: 'SELECT * FROM users', dialect: 'postgresql', tags: ['reporting'] },
      { id: 'q2', name: 'Get orders', sql: 'SELECT id FROM orders', dialect: 'mysql', tags: [] },
    ],
  },
  {
    id: 'col_2',
    name: 'Work',
    queries: [],
  },
]

const storeState = { collections: structuredClone(COLLECTIONS) }

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (sel: (s: object) => unknown) =>
    sel({
      collections:      storeState.collections,
      setQuery:         mockSetQuery,
      setDialect:       mockSetDialect,
      removeCollection: mockRemoveCollection,
    }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  storeState.collections = structuredClone(COLLECTIONS)
})

describe('CollectionPicker', () => {
  it('renders trigger button with total query count', () => {
    render(<CollectionPicker />)
    const btn = screen.getByRole('button', { name: /query collections/i })
    expect(btn.textContent).toContain('2')
  })

  it('trigger starts with aria-expanded false', () => {
    render(<CollectionPicker />)
    expect(screen.getByRole('button', { name: /query collections/i }).getAttribute('aria-expanded')).toBe('false')
  })

  it('opens dropdown on trigger click', () => {
    render(<CollectionPicker />)
    fireEvent.click(screen.getByRole('button', { name: /query collections/i }))
    expect(screen.getByPlaceholderText('Search queries...')).toBeDefined()
  })

  it('shows collection names and queries', () => {
    render(<CollectionPicker />)
    fireEvent.click(screen.getByRole('button', { name: /query collections/i }))
    expect(screen.getByText(/Favorites/)).toBeDefined()
    expect(screen.getByText('Get users')).toBeDefined()
    expect(screen.getByText('Get orders')).toBeDefined()
  })

  it('calls setQuery and setDialect when a query row is clicked', () => {
    render(<CollectionPicker />)
    fireEvent.click(screen.getByRole('button', { name: /query collections/i }))
    fireEvent.click(screen.getByText('Get users'))
    expect(mockSetQuery).toHaveBeenCalledWith('SELECT * FROM users')
    expect(mockSetDialect).toHaveBeenCalledWith('postgresql')
  })

  it('filters queries by search term', () => {
    render(<CollectionPicker />)
    fireEvent.click(screen.getByRole('button', { name: /query collections/i }))
    fireEvent.change(screen.getByPlaceholderText('Search queries...'), { target: { value: 'orders' } })
    expect(screen.queryByText('Get users')).toBeNull()
    expect(screen.getByText('Get orders')).toBeDefined()
  })

  it('filters queries by tag', () => {
    render(<CollectionPicker />)
    fireEvent.click(screen.getByRole('button', { name: /query collections/i }))
    fireEvent.change(screen.getByPlaceholderText('Search queries...'), { target: { value: 'reporting' } })
    expect(screen.getByText('Get users')).toBeDefined()
    expect(screen.queryByText('Get orders')).toBeNull()
  })

  it('shows empty state when search has no matches', () => {
    render(<CollectionPicker />)
    fireEvent.click(screen.getByRole('button', { name: /query collections/i }))
    fireEvent.change(screen.getByPlaceholderText('Search queries...'), { target: { value: 'zzznomatch' } })
    expect(screen.getByText('No queries match your search')).toBeDefined()
  })

  it('shows SaveQueryForm when + Save is clicked', () => {
    render(<CollectionPicker />)
    fireEvent.click(screen.getByRole('button', { name: /query collections/i }))
    fireEvent.click(screen.getByRole('button', { name: /\+ save/i }))
    expect(screen.getByTestId('save-query-form')).toBeDefined()
  })

  it('returns to list view when SaveQueryForm calls onClose', () => {
    render(<CollectionPicker />)
    fireEvent.click(screen.getByRole('button', { name: /query collections/i }))
    fireEvent.click(screen.getByRole('button', { name: /\+ save/i }))
    fireEvent.click(screen.getByRole('button', { name: 'close-save' }))
    expect(screen.getByPlaceholderText('Search queries...')).toBeDefined()
  })

  it('calls removeCollection when delete button is clicked and user confirms', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<CollectionPicker />)
    fireEvent.click(screen.getByRole('button', { name: /query collections/i }))
    fireEvent.click(screen.getByRole('button', { name: /delete collection favorites/i }))
    expect(mockRemoveCollection).toHaveBeenCalledWith('col_1')
    vi.restoreAllMocks()
  })

  it('shows dialect badges for queries', () => {
    render(<CollectionPicker />)
    fireEvent.click(screen.getByRole('button', { name: /query collections/i }))
    expect(screen.getByText('PG')).toBeDefined()
    expect(screen.getByText('MY')).toBeDefined()
  })
})
