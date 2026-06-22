// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MobileDiffLayout } from '@/components/mobile/MobileDiffLayout'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (sel: (s: {
    query: string; queryB: string
    setQuery: (v: string) => void; setQueryB: (v: string) => void
  }) => unknown) =>
    sel({
      query: 'SELECT 1',
      queryB: 'SELECT 2',
      setQuery: vi.fn(),
      setQueryB: vi.fn(),
    }),
}))

vi.mock('@/hooks/useDiff', () => ({
  useDiff: () => ({ diff: null, diffError: null }),
}))

vi.mock('@/components/editor/QueryEditor', () => ({
  QueryEditor: ({ value }: { value: string }) => (
    <textarea data-testid="query-editor" defaultValue={value} readOnly />
  ),
}))

vi.mock('@/components/diagram/DiagramCanvas', () => ({
  DiagramCanvas: () => <div data-testid="diagram-canvas" />,
}))

vi.mock('@/components/diagram/DiffSummaryBar', () => ({
  DiffSummaryBar: ({ diff }: { diff: unknown }) => (
    <div data-testid="diff-summary-bar" data-has-diff={String(diff != null)} />
  ),
}))

afterEach(cleanup)

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MobileDiffLayout', () => {
  it('renderiza los 2 tabs: Query A y Query B', () => {
    render(<MobileDiffLayout />)
    expect(screen.getByText('Query A')).toBeDefined()
    expect(screen.getByText('Query B')).toBeDefined()
  })

  it('muestra la vista Query A por defecto (defaultIndex=0)', () => {
    render(<MobileDiffLayout />)
    expect(screen.getByTestId('query-editor')).toBeDefined()
    expect(screen.getByTestId('diagram-canvas')).toBeDefined()
  })

  it('cambia a Query B al hacer click en su tab', () => {
    render(<MobileDiffLayout />)
    fireEvent.click(screen.getByText('Query B'))
    expect(screen.getByTestId('query-editor')).toBeDefined()
    expect(screen.getByTestId('diagram-canvas')).toBeDefined()
  })

  it('renderiza siempre el DiffSummaryBar', () => {
    render(<MobileDiffLayout />)
    expect(screen.getByTestId('diff-summary-bar')).toBeDefined()
  })

  it('pasa diff=null al DiffSummaryBar cuando useDiff no tiene resultado', () => {
    render(<MobileDiffLayout />)
    const bar = screen.getByTestId('diff-summary-bar')
    expect(bar.getAttribute('data-has-diff')).toBe('false')
  })

  it('renderiza sin crash cuando no hay nodos ni edges en el diff', () => {
    render(<MobileDiffLayout />)
    expect(screen.getByText('Query A')).toBeDefined()
  })
})
