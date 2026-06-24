// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SnippetPicker } from '@/components/editor/SnippetPicker'

const mockSetPendingSnippet = vi.fn()

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (sel: (s: object) => unknown) =>
    sel({ setPendingSnippet: mockSetPendingSnippet }),
}))

vi.mock('@/lib/snippets', () => ({
  SNIPPETS: [
    { id: 'a', title: 'SELECT JOIN', description: 'Inner join', sql: 'SELECT 1' },
    { id: 'b', title: 'CTE', description: 'Common table expr', sql: 'WITH cte AS (SELECT 1) SELECT * FROM cte' },
  ],
}))

beforeEach(() => vi.clearAllMocks())

describe('SnippetPicker', () => {
  it('renders Snippets button', () => {
    render(<SnippetPicker />)
    expect(screen.getByRole('button', { name: /insert a sql snippet/i })).toBeTruthy()
  })

  it('opens dropdown on click', () => {
    render(<SnippetPicker />)
    fireEvent.click(screen.getByRole('button', { name: /insert a sql snippet/i }))
    expect(screen.getByText('SELECT JOIN')).toBeTruthy()
    expect(screen.getByText('CTE')).toBeTruthy()
  })

  it('calls setPendingSnippet when a snippet is picked', () => {
    render(<SnippetPicker />)
    fireEvent.click(screen.getByRole('button', { name: /insert a sql snippet/i }))
    fireEvent.click(screen.getByText('SELECT JOIN'))
    expect(mockSetPendingSnippet).toHaveBeenCalledWith('SELECT 1')
  })

  it('closes dropdown after picking a snippet', () => {
    render(<SnippetPicker />)
    fireEvent.click(screen.getByRole('button', { name: /insert a sql snippet/i }))
    fireEvent.click(screen.getByText('SELECT JOIN'))
    expect(screen.queryByText('CTE')).toBeNull()
  })
})
