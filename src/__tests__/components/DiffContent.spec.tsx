// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DiffContent } from '@/components/layout/DiffContent'
import type { DiffDecorated } from '@/lib/diff/query-diff'

const DIFF_WITH_CHANGES: DiffDecorated = {
  nodesA: [], nodesB: [],
  edgesA: [], edgesB: [],
  diff: { addedNodes: ['n1'], removedNodes: [], changedNodes: [], summary: '1 added' },
}

vi.mock('@/components/editor/DiffEditor', () => ({
  DiffEditor: () => <div data-testid="diff-editor" />,
}))

vi.mock('@/components/diagram/DiffSummaryBar', () => ({
  DiffSummaryBar: ({ diff }: { diff: unknown }) => (
    <div data-testid="diff-summary-bar" data-has-diff={diff != null ? 'true' : 'false'} />
  ),
}))

vi.mock('@/components/diagram/DiagramCanvas', () => ({
  DiagramCanvas: ({ nodes }: { nodes: unknown[] }) => (
    <div data-testid="diagram-canvas" data-node-count={nodes.length} />
  ),
}))

const mockUseDiff = vi.fn()
vi.mock('@/hooks/useDiff', () => ({
  useDiff: () => mockUseDiff(),
}))

describe('DiffContent', () => {
  it('renders a single flex-column wrapper div', () => {
    mockUseDiff.mockReturnValue({ diff: null, diffError: null })
    const { container } = render(<DiffContent />)
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.tagName).toBe('DIV')
    expect(wrapper.style.display).toBe('flex')
    expect(wrapper.style.flexDirection).toBe('column')
  })

  it('renders DiffEditor', () => {
    mockUseDiff.mockReturnValue({ diff: null, diffError: null })
    render(<DiffContent />)
    expect(screen.getByTestId('diff-editor')).toBeDefined()
  })

  it('renders DiffSummaryBar with no diff when useDiff returns null', () => {
    mockUseDiff.mockReturnValue({ diff: null, diffError: null })
    render(<DiffContent />)
    const bar = screen.getByTestId('diff-summary-bar')
    expect(bar.getAttribute('data-has-diff')).toBe('false')
  })

  it('renders DiffSummaryBar with diff when useDiff returns data', () => {
    mockUseDiff.mockReturnValue({ diff: DIFF_WITH_CHANGES, diffError: null })
    render(<DiffContent />)
    const bar = screen.getByTestId('diff-summary-bar')
    expect(bar.getAttribute('data-has-diff')).toBe('true')
  })

  it('renders empty state placeholders when diff is null', () => {
    mockUseDiff.mockReturnValue({ diff: null, diffError: null })
    render(<DiffContent />)
    expect(screen.getByText('Paste SQL in Query A editor')).toBeDefined()
    expect(screen.getByText('Paste SQL in Query B editor')).toBeDefined()
  })

  it('renders "Query A" and "Query B" labels', () => {
    mockUseDiff.mockReturnValue({ diff: null, diffError: null })
    render(<DiffContent />)
    expect(screen.getByText('Query A')).toBeDefined()
    expect(screen.getByText('Query B')).toBeDefined()
  })

  it('shows parse error when diffError is set', () => {
    mockUseDiff.mockReturnValue({ diff: null, diffError: 'Unexpected token' })
    render(<DiffContent />)
    expect(screen.getByText(/parse error: unexpected token/i)).toBeDefined()
  })

  it('does not show error banner when diffError is null', () => {
    mockUseDiff.mockReturnValue({ diff: null, diffError: null })
    render(<DiffContent />)
    expect(screen.queryByText(/parse error/i)).toBeNull()
  })

  it('renders DiffLegend with Added, Removed and Changed items', () => {
    mockUseDiff.mockReturnValue({ diff: null, diffError: null })
    render(<DiffContent />)
    expect(screen.getByText('Added')).toBeDefined()
    expect(screen.getByText('Removed')).toBeDefined()
    expect(screen.getByText('Changed')).toBeDefined()
  })

  it('renders DiffLegend with "Legend:" label', () => {
    mockUseDiff.mockReturnValue({ diff: null, diffError: null })
    render(<DiffContent />)
    expect(screen.getByText(/legend:/i)).toBeDefined()
  })
})
