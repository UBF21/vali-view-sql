// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/store/useAppStore', () => ({ useAppStore: vi.fn() }))
vi.mock('@/lib/optimizer/rewriter', () => ({
  canRewrite: (id: string) => id === 'rewritable-id',
  applyRewrite: vi.fn(),
}))

import { useAppStore } from '@/store/useAppStore'
import { SuggestionsPanel } from '@/components/panels/SuggestionsPanel'

const SUGGESTIONS = [
  { id: 'rewritable-id', title: 'Use index', category: 'index', impact: 'high', reason: 'r', before: 'b', after: 'a' },
  { id: 'non-rewritable', title: 'Add cache', category: 'performance', impact: 'low', reason: 'r', before: 'b', after: 'a' },
]

function mountPanel() {
  vi.mocked(useAppStore).mockImplementation((sel: (s: unknown) => unknown) =>
    sel({ suggestions: SUGGESTIONS, query: 'SELECT 1', setQuery: vi.fn(), undoRewrite: vi.fn(), previousQuery: null })
  )
  return render(<SuggestionsPanel />)
}

describe('SuggestionsPanel Apply button', () => {
  beforeEach(() => vi.clearAllMocks())

  it('always renders Apply button for every suggestion', () => {
    mountPanel()
    const applyButtons = screen.getAllByRole('button', { name: /apply/i })
    expect(applyButtons).toHaveLength(2)
  })

  it('Apply button is disabled for non-rewritable suggestions', () => {
    mountPanel()
    const applyButtons = screen.getAllByRole('button', { name: /apply/i })
    const rewritableBtn = applyButtons.find(b => b.getAttribute('aria-label')?.includes('Apply suggestion:'))
    const nonRewritableBtn = applyButtons.find(b => b.getAttribute('aria-label')?.includes('Auto-apply not available:'))
    expect(rewritableBtn).not.toBeDisabled()
    expect(nonRewritableBtn).toBeDisabled()
  })

  it('non-rewritable Apply button has helpful title', () => {
    mountPanel()
    const applyButtons = screen.getAllByRole('button', { name: /apply/i })
    const nonRewritableBtn = applyButtons.find(b => b.getAttribute('aria-label')?.includes('Auto-apply not available:'))
    expect(nonRewritableBtn?.title).toBe('Auto-apply not available for this suggestion')
  })
})
