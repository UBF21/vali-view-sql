// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MobileNavSheet } from '@/components/mobile/MobileNavSheet'

// ── Mocks ──────────────────────────────────────────────────────────────────────

// framer-motion: render children sin animaciones en jsdom
vi.mock('framer-motion', () => ({
  motion: new Proxy({} as Record<string, unknown>, {
    get: (_t, tag: string) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ({ children, onClick, style }: any) => {
        const Tag = tag as keyof JSX.IntrinsicElements
        return <Tag onClick={onClick} style={style}>{children}</Tag>
      },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const mockSetMode    = vi.fn()
const mockSetDialect = vi.fn()

let mockMode:    string = 'explain'
let mockDialect: string = 'postgresql'

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (selector: (s: object) => unknown) =>
    selector({
      mode:       mockMode,
      setMode:    mockSetMode,
      dialect:    mockDialect,
      setDialect: mockSetDialect,
    }),
}))

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  mockMode    = 'explain'
  mockDialect = 'postgresql'
  vi.clearAllMocks()
})

afterEach(cleanup)

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('MobileNavSheet — visibilidad', () => {
  it('renderiza los modos cuando open=true', () => {
    render(<MobileNavSheet open onClose={vi.fn()} />)
    expect(screen.getByText('Explain')).toBeDefined()
    expect(screen.getByText('Diff')).toBeDefined()
    expect(screen.getByText('Stepper')).toBeDefined()
  })

  it('no renderiza contenido cuando open=false', () => {
    render(<MobileNavSheet open={false} onClose={vi.fn()} />)
    expect(screen.queryByText('Explain')).toBeNull()
    expect(screen.queryByText('Diff')).toBeNull()
  })
})

describe('MobileNavSheet — selección de modo', () => {
  it('llama setMode y onClose al seleccionar un modo', () => {
    const onClose = vi.fn()
    render(<MobileNavSheet open onClose={onClose} />)
    fireEvent.click(screen.getByText('Diff'))
    expect(mockSetMode).toHaveBeenCalledWith('diff')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('llama setMode con "stepper" al clicar Stepper', () => {
    render(<MobileNavSheet open onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('Stepper'))
    expect(mockSetMode).toHaveBeenCalledWith('stepper')
  })

  it('llama setMode con "explain" al clicar Explain', () => {
    mockMode = 'diff'
    render(<MobileNavSheet open onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('Explain'))
    expect(mockSetMode).toHaveBeenCalledWith('explain')
  })
})

describe('MobileNavSheet — descripciones de modo', () => {
  it('muestra la descripción de cada modo', () => {
    render(<MobileNavSheet open onClose={vi.fn()} />)
    expect(screen.getByText('Visualize SQL as diagram')).toBeDefined()
    expect(screen.getByText('Compare two queries')).toBeDefined()
    expect(screen.getByText('Step through execution')).toBeDefined()
  })
})

describe('MobileNavSheet — sección de dialect', () => {
  it('renderiza el selector de dialect', () => {
    render(<MobileNavSheet open onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: /sql dialect/i })).toBeDefined()
  })

  it('muestra el dialect activo en el trigger', () => {
    mockDialect = 'mysql'
    render(<MobileNavSheet open onClose={vi.fn()} />)
    expect(screen.getByText('MySQL')).toBeDefined()
  })

  it('llama setDialect al cambiar dialect', () => {
    render(<MobileNavSheet open onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /sql dialect/i }))
    const options = screen.getAllByRole('option')
    fireEvent.click(options.find(o => o.textContent?.includes('SQL Server'))!)
    expect(mockSetDialect).toHaveBeenCalledWith('sqlserver')
  })

  it('muestra label "Dialect"', () => {
    render(<MobileNavSheet open onClose={vi.fn()} />)
    expect(screen.getByText('Dialect')).toBeDefined()
  })
})

describe('MobileNavSheet — label de sección', () => {
  it('muestra el label "Switch mode"', () => {
    render(<MobileNavSheet open onClose={vi.fn()} />)
    expect(screen.getByText('Switch mode')).toBeDefined()
  })
})
