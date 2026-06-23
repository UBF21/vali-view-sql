// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DialectSelector, DIALECTS } from '@/components/editor/DialectSelector'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, style, role, 'aria-label': ariaLabel }: React.HTMLAttributes<HTMLDivElement>) =>
      <div style={style} role={role} aria-label={ariaLabel}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const onChange = vi.fn()

function open(value: 'postgresql' | 'mysql' | 'sqlserver' | 'sqlite' = 'postgresql') {
  render(<DialectSelector value={value} onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: /sql dialect/i }))
}

beforeEach(() => vi.clearAllMocks())

describe('DialectSelector — trigger', () => {
  it('shows active dialect label', () => {
    render(<DialectSelector value="postgresql" onChange={onChange} />)
    expect(screen.getByText('PostgreSQL')).toBeDefined()
  })

  it('shows MySQL when value is mysql', () => {
    render(<DialectSelector value="mysql" onChange={onChange} />)
    expect(screen.getByText('MySQL')).toBeDefined()
  })

  it('shows SQL Server when value is sqlserver', () => {
    render(<DialectSelector value="sqlserver" onChange={onChange} />)
    expect(screen.getByText('SQL Server')).toBeDefined()
  })

  it('dropdown closed by default', () => {
    render(<DialectSelector value="postgresql" onChange={onChange} />)
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('opens dropdown on click', () => {
    open()
    expect(screen.getByRole('listbox')).toBeDefined()
  })
})

describe('DialectSelector — dropdown', () => {
  it('shows all 4 options', () => {
    open()
    expect(screen.getAllByRole('option')).toHaveLength(4)
  })

  it('marks active option as selected', () => {
    open('mysql')
    const selected = screen.getAllByRole('option').filter(o => o.getAttribute('aria-selected') === 'true')
    expect(selected).toHaveLength(1)
  })

  it('shows descriptions', () => {
    open()
    expect(screen.getByText('Open-source object-relational')).toBeDefined()
    expect(screen.getByText('Oracle open-source RDBMS')).toBeDefined()
    expect(screen.getByText('Microsoft enterprise RDBMS')).toBeDefined()
  })
})

describe('DialectSelector — selection', () => {
  it('calls onChange with selected value', () => {
    open('postgresql')
    const options = screen.getAllByRole('option')
    fireEvent.click(options.find(o => o.textContent?.includes('MySQL'))!)
    expect(onChange).toHaveBeenCalledWith('mysql')
  })

  it('closes dropdown after selection', () => {
    open('postgresql')
    fireEvent.click(screen.getAllByRole('option')[1])
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('calls onChange with sqlserver', () => {
    open('postgresql')
    const options = screen.getAllByRole('option')
    fireEvent.click(options.find(o => o.textContent?.includes('SQL Server'))!)
    expect(onChange).toHaveBeenCalledWith('sqlserver')
  })
})

describe('DialectSelector — DIALECTS export', () => {
  it('exports 4 dialects', () => {
    expect(DIALECTS).toHaveLength(4)
  })

  it('each dialect has value, label, abbr, Icon', () => {
    for (const d of DIALECTS) {
      expect(d.value).toBeTruthy()
      expect(d.label).toBeTruthy()
      expect(d.abbr).toBeTruthy()
      expect(typeof d.Icon).toBe('function')
    }
  })
})
