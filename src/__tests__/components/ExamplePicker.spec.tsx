// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExamplePicker } from '@/components/editor/ExamplePicker'
import { EXAMPLES } from '@/lib/examples'

const mockSetQuery = vi.fn()
let mockDialect = 'postgresql'

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (sel: (s: object) => unknown) => sel({
    setQuery: mockSetQuery,
    get dialect() { return mockDialect },
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockDialect = 'postgresql'
})

describe('ExamplePicker — trigger', () => {
  it('renders Examples button', () => {
    render(<ExamplePicker />)
    expect(screen.getByRole('button', { name: /pick an example/i })).toBeDefined()
    expect(screen.getByText('Examples')).toBeDefined()
  })

  it('dropdown is closed by default', () => {
    render(<ExamplePicker />)
    expect(screen.queryByText('PostgreSQL')).toBeNull()
  })

  it('opens dropdown on click', () => {
    render(<ExamplePicker />)
    fireEvent.click(screen.getByRole('button', { name: /pick an example/i }))
    expect(screen.getByText('PostgreSQL')).toBeDefined()
  })
})

describe('ExamplePicker — filters by dialect', () => {
  it('shows only postgresql examples when dialect is postgresql', () => {
    mockDialect = 'postgresql'
    render(<ExamplePicker />)
    fireEvent.click(screen.getByRole('button', { name: /pick an example/i }))
    const pgExamples = EXAMPLES.filter(e => e.dialect === 'postgresql')
    for (const ex of pgExamples) {
      expect(screen.getByText(ex.title)).toBeDefined()
    }
    const mysqlExample = EXAMPLES.find(e => e.dialect === 'mysql')!
    expect(screen.queryByText(mysqlExample.title)).toBeNull()
  })

  it('shows only mysql examples when dialect is mysql', () => {
    mockDialect = 'mysql'
    render(<ExamplePicker />)
    fireEvent.click(screen.getByRole('button', { name: /pick an example/i }))
    expect(screen.getByText('MySQL')).toBeDefined()
    const pgExample = EXAMPLES.find(e => e.dialect === 'postgresql')!
    expect(screen.queryByText(pgExample.title)).toBeNull()
  })

  it('shows only sqlserver examples when dialect is sqlserver', () => {
    mockDialect = 'sqlserver'
    render(<ExamplePicker />)
    fireEvent.click(screen.getByRole('button', { name: /pick an example/i }))
    expect(screen.getByText('SQL Server')).toBeDefined()
    const pgExample = EXAMPLES.find(e => e.dialect === 'postgresql')!
    expect(screen.queryByText(pgExample.title)).toBeNull()
  })
})

describe('ExamplePicker — selection', () => {
  it('calls setQuery with the example SQL when clicked', () => {
    mockDialect = 'postgresql'
    render(<ExamplePicker />)
    fireEvent.click(screen.getByRole('button', { name: /pick an example/i }))
    const firstPg = EXAMPLES.find(e => e.dialect === 'postgresql')!
    fireEvent.click(screen.getByText(firstPg.title))
    expect(mockSetQuery).toHaveBeenCalledWith(firstPg.sql)
  })

  it('closes dropdown after selection', () => {
    mockDialect = 'postgresql'
    render(<ExamplePicker />)
    fireEvent.click(screen.getByRole('button', { name: /pick an example/i }))
    const firstPg = EXAMPLES.find(e => e.dialect === 'postgresql')!
    fireEvent.click(screen.getByText(firstPg.title))
    expect(screen.queryByText('PostgreSQL')).toBeNull()
  })
})
