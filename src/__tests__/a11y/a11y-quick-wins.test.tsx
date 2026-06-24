// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: React.ComponentProps<'div'>) => <div {...p}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/store/useAppStore', () => ({ useAppStore: vi.fn() }))

import { useAppStore } from '@/store/useAppStore'

// ── Toast tests ────────────────────────────────────────────────────────────
import { Toast } from '@/components/ui/Toast'

describe('Toast a11y', () => {
  it('has role=status and aria-live=polite', () => {
    render(<Toast message="Copied!" visible onHide={vi.fn()} />)
    const el = screen.getByRole('status')
    expect(el.getAttribute('aria-live')).toBe('polite')
    expect(el.textContent).toBe('Copied!')
  })
})

// ── ComplexityBadge Escape ─────────────────────────────────────────────────
import { ComplexityBadge } from '@/components/diagram/ComplexityBadge'

describe('ComplexityBadge Escape key', () => {
  beforeEach(() => vi.clearAllMocks())

  it('closes breakdown panel on Escape', () => {
    vi.mocked(useAppStore).mockImplementation((sel: (s: unknown) => unknown) =>
      sel({
        complexityResult: {
          level: 'Simple', score: 2,
          breakdown: { tableCount: 1, joinCount: 0, subqueryCount: 0, cteCount: 0, setOpCount: 0, procedureCount: 0, aggregateCount: 0, conditionCount: 0, loopCount: 0 },
        },
      })
    )
    render(<ComplexityBadge />)
    fireEvent.click(screen.getByRole('button', { name: /query complexity/i }))
    expect(screen.getByText('Complexity Breakdown')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByText('Complexity Breakdown')).toBeNull()
  })
})

// ── PanelRight badge aria-labels ───────────────────────────────────────────
vi.mock('@/components/panels/GlossaryPanel',    () => ({ GlossaryPanel: () => <div>G</div> }))
vi.mock('@/components/panels/IssuesPanel',      () => ({ IssuesPanel: () => <div>I</div> }))
vi.mock('@/components/panels/SuggestionsPanel', () => ({ SuggestionsPanel: () => <div>S</div> }))
vi.mock('@/components/panels/LineagePanel',     () => ({ LineagePanel: () => <div>L</div> }))
vi.mock('@/components/panels/SchemaPanel',      () => ({ SchemaPanel: () => <div>SC</div> }))

import { PanelRight } from '@/components/layout/PanelRight'

describe('PanelRight badge aria-labels', () => {
  beforeEach(() => vi.clearAllMocks())

  it('issues badge has aria-label', () => {
    vi.mocked(useAppStore).mockImplementation((sel: (s: unknown) => unknown) =>
      sel({
        issues: [{ id: '1', severity: 'error', message: 'e' }, { id: '2', severity: 'warning', message: 'w' }],
        suggestions: [],
      })
    )
    render(<PanelRight />)
    const badge = document.querySelector('[aria-label*="issue"]')
    expect(badge?.getAttribute('aria-label')).toBe('2 issues')
  })

  it('suggestions badge has aria-label', () => {
    vi.mocked(useAppStore).mockImplementation((sel: (s: unknown) => unknown) =>
      sel({
        issues: [],
        suggestions: [{ id: 's1' }, { id: 's2' }, { id: 's3' }],
      })
    )
    render(<PanelRight />)
    const badge = document.querySelector('[aria-label*="suggestion"]')
    expect(badge?.getAttribute('aria-label')).toBe('3 suggestions')
  })
})
