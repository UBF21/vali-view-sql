// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SaveQueryForm } from '@/components/editor/SaveQueryForm'

const mockSaveQueryToCollection = vi.fn()
const mockAddCollection = vi.fn()

const COLLECTIONS = [
  { id: 'col_1', name: 'Favorites', queries: [] },
  { id: 'col_2', name: 'Work',      queries: [{ id: 'q1', name: 'Q1', sql: 'SELECT 1', dialect: 'postgresql', tags: [], createdAt: 0 }] },
]

const storeState = { collections: COLLECTIONS as typeof COLLECTIONS }

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (sel: (s: object) => unknown) =>
    sel({
      collections:           storeState.collections,
      saveQueryToCollection: mockSaveQueryToCollection,
      addCollection:         mockAddCollection,
    }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  storeState.collections = COLLECTIONS
})

describe('SaveQueryForm', () => {
  it('renders form fields and Save button', () => {
    render(<SaveQueryForm onClose={vi.fn()} />)
    expect(screen.getByPlaceholderText('My query name')).toBeDefined()
    expect(screen.getByRole('button', { name: /save/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDefined()
  })

  it('Save button is disabled when name is empty', () => {
    render(<SaveQueryForm onClose={vi.fn()} />)
    const btn = screen.getByRole('button', { name: /^save$/i })
    expect((btn as HTMLButtonElement).disabled).toBe(true)
  })

  it('Save button enables after typing a name', () => {
    render(<SaveQueryForm onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('My query name'), { target: { value: 'My query' } })
    const btn = screen.getByRole('button', { name: /^save$/i })
    expect((btn as HTMLButtonElement).disabled).toBe(false)
  })

  it('calls saveQueryToCollection with correct args on submit', () => {
    const onClose = vi.fn()
    render(<SaveQueryForm onClose={onClose} />)
    fireEvent.change(screen.getByPlaceholderText('My query name'), { target: { value: 'Test Q' } })
    fireEvent.change(screen.getByPlaceholderText('reporting, slow, draft'), { target: { value: 'a, b' } })
    fireEvent.submit(screen.getByRole('form', { name: /save query form/i }))
    expect(mockSaveQueryToCollection).toHaveBeenCalledWith('col_1', {
      name: 'Test Q', description: undefined, tags: ['a', 'b'],
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    render(<SaveQueryForm onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls addCollection when + New is clicked with a name', () => {
    render(<SaveQueryForm onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('New collection name'), { target: { value: 'My Col' } })
    fireEvent.click(screen.getByRole('button', { name: /\+ new/i }))
    expect(mockAddCollection).toHaveBeenCalledWith('My Col')
  })

  it('does not call addCollection when new collection name is empty', () => {
    render(<SaveQueryForm onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /\+ new/i }))
    expect(mockAddCollection).not.toHaveBeenCalled()
  })

  it('renders collection options in select', () => {
    render(<SaveQueryForm onClose={vi.fn()} />)
    expect(screen.getByText('Favorites (0)')).toBeDefined()
    expect(screen.getByText('Work (1)')).toBeDefined()
  })
})
