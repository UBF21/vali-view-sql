// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DiffEditor } from '@/components/editor/DiffEditor'

const mockSetQuery = vi.fn()
const mockSetQueryB = vi.fn()

let storeState = { query: 'SELECT 1', queryB: 'SELECT 2' }

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (sel: (s: typeof storeState & {
    setQuery: typeof mockSetQuery
    setQueryB: typeof mockSetQueryB
  }) => unknown) =>
    sel({ ...storeState, setQuery: mockSetQuery, setQueryB: mockSetQueryB }),
}))

// QueryEditor renders a textarea — mock it to keep tests simple
vi.mock('@/components/editor/QueryEditor', () => ({
  QueryEditor: ({ value, onChange, placeholder }: {
    value: string
    onChange: (v: string) => void
    placeholder?: string
  }) => (
    <textarea
      data-testid="query-editor"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}))

beforeEach(() => {
  mockSetQuery.mockClear()
  mockSetQueryB.mockClear()
  storeState = { query: 'SELECT 1', queryB: 'SELECT 2' }
})

describe('DiffEditor', () => {
  it('renders two editor columns', () => {
    render(<DiffEditor />)
    const editors = screen.getAllByTestId('query-editor')
    expect(editors).toHaveLength(2)
  })

  it('renders Query A label with badge', () => {
    render(<DiffEditor />)
    expect(screen.getByText('A')).toBeDefined()
  })

  it('renders Query B label with badge', () => {
    render(<DiffEditor />)
    expect(screen.getByText('B')).toBeDefined()
  })

  it('populates Query A editor with store query', () => {
    render(<DiffEditor />)
    const editors = screen.getAllByTestId('query-editor') as HTMLTextAreaElement[]
    expect(editors[0].value).toBe('SELECT 1')
  })

  it('populates Query B editor with store queryB', () => {
    render(<DiffEditor />)
    const editors = screen.getAllByTestId('query-editor') as HTMLTextAreaElement[]
    expect(editors[1].value).toBe('SELECT 2')
  })

  it('calls setQuery when Query A changes', () => {
    render(<DiffEditor />)
    const editors = screen.getAllByTestId('query-editor')
    fireEvent.change(editors[0], { target: { value: 'SELECT a FROM t' } })
    expect(mockSetQuery).toHaveBeenCalledWith('SELECT a FROM t')
  })

  it('calls setQueryB when Query B changes', () => {
    render(<DiffEditor />)
    const editors = screen.getAllByTestId('query-editor')
    fireEvent.change(editors[1], { target: { value: 'SELECT b FROM t' } })
    expect(mockSetQueryB).toHaveBeenCalledWith('SELECT b FROM t')
  })

  it('renders divider icon between editors', () => {
    const { container } = render(<DiffEditor />)
    // ArrowLeftRight renders an svg
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThanOrEqual(1)
  })
})
