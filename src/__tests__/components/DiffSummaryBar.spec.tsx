// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DiffSummaryBar } from '@/components/diagram/DiffSummaryBar'
import type { DiffResult } from '@/types'

const NO_DIFF: DiffResult = { addedNodes: [], removedNodes: [], changedNodes: [], summary: 'No differences' }

const WITH_DIFF: DiffResult = {
  addedNodes: ['n1', 'n2'],
  removedNodes: ['n3'],
  changedNodes: ['n4', 'n5', 'n6'],
  summary: '2 added, 1 removed, 3 changed',
}

describe('DiffSummaryBar', () => {
  it('renders placeholder when diff is undefined', () => {
    render(<DiffSummaryBar diff={undefined} />)
    expect(screen.getByText(/paste sql in both editors/i)).toBeDefined()
  })

  it('renders "No differences" pill when all counts are zero', () => {
    render(<DiffSummaryBar diff={NO_DIFF} />)
    expect(screen.getByText('No differences')).toBeDefined()
    expect(screen.getByText(/query a → query b/i)).toBeDefined()
  })

  it('renders added pill with correct count', () => {
    render(<DiffSummaryBar diff={WITH_DIFF} />)
    expect(screen.getByText('+2 added')).toBeDefined()
  })

  it('renders removed pill with correct count', () => {
    render(<DiffSummaryBar diff={WITH_DIFF} />)
    expect(screen.getByText('-1 removed')).toBeDefined()
  })

  it('renders changed pill with correct count', () => {
    render(<DiffSummaryBar diff={WITH_DIFF} />)
    expect(screen.getByText('~3 changed')).toBeDefined()
  })

  it('does not render "No differences" when there are changes', () => {
    render(<DiffSummaryBar diff={WITH_DIFF} />)
    expect(screen.queryByText('No differences')).toBeNull()
  })

  it('only shows pills for non-zero counts', () => {
    const partial: DiffResult = { addedNodes: ['n1'], removedNodes: [], changedNodes: [], summary: '1 added' }
    render(<DiffSummaryBar diff={partial} />)
    expect(screen.getByText('+1 added')).toBeDefined()
    expect(screen.queryByText(/-0 removed/i)).toBeNull()
    expect(screen.queryByText(/~0 changed/i)).toBeNull()
  })

  it('renders with role="status" when diff is provided', () => {
    render(<DiffSummaryBar diff={NO_DIFF} />)
    expect(screen.getByRole('status')).toBeDefined()
  })
})
