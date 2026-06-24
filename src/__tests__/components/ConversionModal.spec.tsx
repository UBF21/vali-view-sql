// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ConversionModal } from '@/components/editor/ConversionModal'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  motion: new Proxy({} as Record<string, unknown>, {
    get: (_t, tag: string) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ({ children, style, role, 'aria-modal': ariaModal, 'aria-label': ariaLabel }: any) => {
        const Tag = tag as keyof JSX.IntrinsicElements
        return <Tag style={style} role={role} aria-modal={ariaModal} aria-label={ariaLabel}>{children}</Tag>
      },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// ── Helpers ────────────────────────────────────────────────────────────────────

const onClose = vi.fn()
const onApply = vi.fn()

function renderModal(props: Partial<React.ComponentProps<typeof ConversionModal>> = {}) {
  return render(
    <ConversionModal
      open={true}
      fromDialect="postgresql"
      sourceSql="SELECT * FROM users LIMIT 10"
      onClose={onClose}
      onApply={onApply}
      {...props}
    />,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
})
afterEach(cleanup)

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ConversionModal — visibility', () => {
  it('renders dialog when open=true', () => {
    renderModal()
    expect(screen.getByRole('dialog')).toBeDefined()
  })

  it('renders nothing when open=false', () => {
    renderModal({ open: false })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows "Convert dialect" heading', () => {
    renderModal()
    expect(screen.getByText('Convert dialect')).toBeDefined()
  })
})

describe('ConversionModal — header', () => {
  it('shows source dialect label', () => {
    renderModal({ fromDialect: 'postgresql' })
    expect(screen.getByText('PostgreSQL')).toBeDefined()
  })

  it('target select excludes source dialect', () => {
    renderModal({ fromDialect: 'postgresql' })
    const select = screen.getByRole('combobox') as HTMLSelectElement
    const options = Array.from(select.options).map(o => o.value)
    expect(options).not.toContain('postgresql')
    expect(options.length).toBe(3)
  })

  it('calls onClose when X button is clicked', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when backdrop is clicked', () => {
    renderModal()
    fireEvent.click(screen.getByTestId('conversion-modal-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('ConversionModal — Escape key', () => {
  it('calls onClose on Escape', () => {
    renderModal()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose on other keys', () => {
    renderModal()
    fireEvent.keyDown(document, { key: 'Enter' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('does not fire Escape handler when closed', () => {
    renderModal({ open: false })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('ConversionModal — changes summary', () => {
  it('shows "no conversions" message when same dialect semantics apply', () => {
    // sqlite → postgresql has no rules for plain SELECT
    renderModal({ fromDialect: 'sqlite', sourceSql: 'SELECT 1' })
    // change target to postgresql
    const select = screen.getByRole('combobox') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'postgresql' } })
    expect(screen.getByText(/no conversions needed/i)).toBeDefined()
  })

  it('shows transformation count when conversions applied', () => {
    // postgresql → sqlserver: LIMIT converts to TOP
    renderModal({ fromDialect: 'postgresql', sourceSql: 'SELECT * FROM t LIMIT 5' })
    const select = screen.getByRole('combobox') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'sqlserver' } })
    expect(screen.getByText(/transformation/i)).toBeDefined()
  })
})

describe('ConversionModal — footer actions', () => {
  it('renders Copy and Use this query buttons', () => {
    renderModal()
    expect(screen.getByRole('button', { name: /copy/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /use this query/i })).toBeDefined()
  })

  it('Copy button writes converted SQL to clipboard', () => {
    renderModal({ fromDialect: 'postgresql', sourceSql: 'SELECT 1' })
    fireEvent.click(screen.getByRole('button', { name: /copy/i }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('SELECT 1')
  })

  it('"Use this query" calls onApply with converted SQL and target dialect', () => {
    renderModal({ fromDialect: 'postgresql', sourceSql: 'SELECT 1' })
    const select = screen.getByRole('combobox') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'mysql' } })
    fireEvent.click(screen.getByRole('button', { name: /use this query/i }))
    expect(onApply).toHaveBeenCalledWith('SELECT 1', 'mysql')
  })

  it('"Use this query" also calls onClose', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: /use this query/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('ConversionModal — target dialect select', () => {
  it('changing select updates rendered SQL', () => {
    renderModal({ fromDialect: 'sqlserver', sourceSql: 'SELECT TOP 5 * FROM t' })
    const select = screen.getByRole('combobox') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'postgresql' } })
    // MSSQL→PG: SELECT TOP 5 → LIMIT 5
    const pre = document.querySelector('pre') as HTMLElement
    expect(pre.textContent).toMatch(/LIMIT 5/)
  })
})
