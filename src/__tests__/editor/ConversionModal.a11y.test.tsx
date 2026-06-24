// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('framer-motion', () => ({
  motion: { div: ({ children, ...p }: React.ComponentProps<'div'>) => <div {...p}>{children}</div> },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/editor/DialectSelector', () => ({
  DIALECTS: [
    { value: 'postgresql', label: 'PostgreSQL' },
    { value: 'mysql', label: 'MySQL' },
  ],
}))

vi.mock('@/lib/converter/dialect-converter', () => ({
  convertDialect: () => ({ convertedSQL: 'SELECT 1', changes: [] }),
}))

import { ConversionModal } from '@/components/editor/ConversionModal'

const defaultProps = {
  open: true,
  fromDialect: 'postgresql' as const,
  sourceSql: 'SELECT 1',
  onClose: vi.fn(),
  onApply: vi.fn(),
}

describe('ConversionModal a11y', () => {
  it('renders dialog with role=dialog', () => {
    render(<ConversionModal {...defaultProps} />)
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('Copy button has aria-live region', () => {
    render(<ConversionModal {...defaultProps} />)
    const liveRegion = document.querySelector('[aria-live="polite"]')
    expect(liveRegion).toBeTruthy()
    expect(liveRegion?.textContent).toBe('Copy')
  })

  it('dialog panel has tabIndex=-1 for focus', () => {
    render(<ConversionModal {...defaultProps} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('tabindex')).toBe('-1')
  })
})
