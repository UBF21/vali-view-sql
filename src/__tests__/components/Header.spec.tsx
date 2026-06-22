// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Header } from '@/components/layout/Header'

// ── Mocks ──────────────────────────────────────────────────────────────────────

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

const mockSetTheme   = vi.fn()
const mockSetMode    = vi.fn()
const mockSetDialect = vi.fn()

let mockTheme:   string = 'dark'
let mockMode:    string = 'explain'
let mockDialect: string = 'postgresql'
let mockIsMobile        = false

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (selector: (s: object) => unknown) =>
    selector({
      theme:      mockTheme,   setTheme:   mockSetTheme,
      mode:       mockMode,    setMode:    mockSetMode,
      dialect:    mockDialect, setDialect: mockSetDialect,
    }),
}))

vi.mock('@/hooks/useIsMobile', () => ({
  useIsMobile: () => mockIsMobile,
}))

// Toast: render simple sin animaciones
vi.mock('@/components/ui/Toast', () => ({
  Toast: ({ visible, message }: { visible: boolean; message: string }) =>
    visible ? <div role="status">{message}</div> : null,
}))

// MobileNavSheet: stub controlable
const mockNavSheetOnClose = vi.fn()
vi.mock('@/components/mobile/MobileNavSheet', () => ({
  MobileNavSheet: ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    mockNavSheetOnClose.mockImplementation(onClose)
    return open ? <div data-testid="mobile-nav-sheet" /> : null
  },
}))

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  mockTheme    = 'dark'
  mockMode     = 'explain'
  mockDialect  = 'postgresql'
  mockIsMobile = false
  vi.clearAllMocks()

  // clipboard mock
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  })
})

afterEach(cleanup)

// ── Tests — desktop ────────────────────────────────────────────────────────────

describe('Header — desktop', () => {
  it('renderiza el logo con badge "SQL Explainer"', () => {
    render(<Header />)
    expect(screen.getByText('SQL Explainer')).toBeDefined()
  })

  it('renderiza los tres mode-tabs', () => {
    render(<Header />)
    expect(screen.getByRole('button', { name: /switch to explain mode/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /switch to diff mode/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /switch to stepper mode/i })).toBeDefined()
  })

  it('llama setMode al clicar un tab', () => {
    render(<Header />)
    fireEvent.click(screen.getByRole('button', { name: /switch to diff mode/i }))
    expect(mockSetMode).toHaveBeenCalledWith('diff')
  })

  it('renderiza el botón Copy Link', () => {
    render(<Header />)
    expect(screen.getByRole('button', { name: /copy shareable link/i })).toBeDefined()
  })

  it('copia el link y muestra el toast al clicar Copy Link', async () => {
    render(<Header />)
    fireEvent.click(screen.getByRole('button', { name: /copy shareable link/i }))
    await vi.waitFor(() => {
      expect(screen.getByRole('status')).toBeDefined()
    })
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(window.location.href)
  })

  it('alterna el tema de dark a light', () => {
    render(<Header />)
    fireEvent.click(screen.getByRole('button', { name: /switch to light mode/i }))
    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })

  it('alterna el tema de light a dark', () => {
    mockTheme = 'light'
    render(<Header />)
    fireEvent.click(screen.getByRole('button', { name: /switch to dark mode/i }))
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('NO renderiza el botón de hamburguesa en desktop', () => {
    render(<Header />)
    expect(screen.queryByRole('button', { name: /open navigation menu/i })).toBeNull()
  })

  it('NO renderiza MobileNavSheet en desktop', () => {
    render(<Header />)
    expect(screen.queryByTestId('mobile-nav-sheet')).toBeNull()
  })
})

// ── Tests — mobile ─────────────────────────────────────────────────────────────

describe('Header — mobile', () => {
  beforeEach(() => { mockIsMobile = true })

  it('renderiza el logo SIN badge "SQL Explainer"', () => {
    render(<Header />)
    expect(screen.queryByText('SQL Explainer')).toBeNull()
  })

  it('NO renderiza los mode-tabs en mobile', () => {
    render(<Header />)
    expect(screen.queryByRole('button', { name: /switch to explain mode/i })).toBeNull()
  })

  it('renderiza el botón de hamburguesa', () => {
    render(<Header />)
    expect(screen.getByRole('button', { name: /open navigation menu/i })).toBeDefined()
  })

  it('abre MobileNavSheet al clicar el botón de menú', () => {
    render(<Header />)
    expect(screen.queryByTestId('mobile-nav-sheet')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }))
    expect(screen.getByTestId('mobile-nav-sheet')).toBeDefined()
  })

  it('renderiza el botón de tema en mobile', () => {
    render(<Header />)
    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeDefined()
  })

  it('alterna el tema desde mobile', () => {
    render(<Header />)
    fireEvent.click(screen.getByRole('button', { name: /switch to light mode/i }))
    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })
})
