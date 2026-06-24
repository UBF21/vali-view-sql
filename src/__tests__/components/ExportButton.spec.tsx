// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { ExportButton } from '@/components/diagram/ExportButton'

// ── mocks ─────────────────────────────────────────────────────────────────────

const mockExportPNG    = vi.fn().mockResolvedValue(undefined)
const mockExportSVG    = vi.fn().mockResolvedValue(undefined)
const mockExportReport = vi.fn().mockResolvedValue(undefined)

vi.mock('@/hooks/useExport', () => ({
  useExport: () => ({
    exportPNG:    mockExportPNG,
    exportSVG:    mockExportSVG,
    exportReport: mockExportReport,
    canvasRef:    { current: null },
  }),
}))

const mockUseAppStore = vi.fn()
vi.mock('@/store/useAppStore', () => ({
  useAppStore: (sel: Parameters<typeof mockUseAppStore>[0]) => mockUseAppStore(sel),
}))

function withNodes(count: number) {
  const nodes = count > 0 ? new Array(count).fill({}) : []
  mockUseAppStore.mockImplementation(
    (sel: (s: { parseResult: { nodes: unknown[] } | null }) => unknown) =>
      sel({ parseResult: count > 0 ? { nodes } : null }),
  )
}

// ── setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  withNodes(2) // default: canvas has nodes
})
afterEach(cleanup)

// ── renderizado ───────────────────────────────────────────────────────────────

describe('ExportButton — renderizado', () => {
  it('muestra los tres botones', () => {
    render(<ExportButton />)
    expect(screen.getByRole('button', { name: /export diagram as png/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /export diagram as svg/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /export analysis report/i })).toBeDefined()
  })

  it('los botones están habilitados cuando el diagrama tiene nodos', () => {
    render(<ExportButton />)
    screen.getAllByRole('button').forEach(btn =>
      expect((btn as HTMLButtonElement).disabled).toBe(false),
    )
  })
})

// ── guards: canvas vacío ──────────────────────────────────────────────────────

describe('ExportButton — canvas vacío', () => {
  beforeEach(() => withNodes(0))

  it('deshabilita PNG y SVG cuando el canvas está vacío', () => {
    render(<ExportButton />)
    const [png, svg, report] = screen.getAllByRole('button') as HTMLButtonElement[]
    expect(png.disabled).toBe(true)
    expect(svg.disabled).toBe(true)
    expect(report.disabled).toBe(false)
  })

  it('muestra título explicativo en PNG deshabilitado', () => {
    render(<ExportButton />)
    const [png] = screen.getAllByRole('button')
    expect(png.title).toBe('Diagram is empty — type a SQL query first')
  })

  it('muestra título explicativo en SVG deshabilitado', () => {
    render(<ExportButton />)
    const [, svg] = screen.getAllByRole('button')
    expect(svg.title).toBe('Diagram is empty — type a SQL query first')
  })

  it('Report mantiene su título normal aunque el canvas esté vacío', () => {
    render(<ExportButton />)
    const [, , report] = screen.getAllByRole('button')
    expect(report.title).toBe('Open analysis report in new tab')
  })
})

// ── acciones ──────────────────────────────────────────────────────────────────

describe('ExportButton — acciones', () => {
  it('llama exportPNG al clicar PNG', async () => {
    render(<ExportButton />)
    fireEvent.click(screen.getByRole('button', { name: /export diagram as png/i }))
    await waitFor(() => expect(mockExportPNG).toHaveBeenCalledTimes(1))
  })

  it('llama exportSVG al clicar SVG', async () => {
    render(<ExportButton />)
    fireEvent.click(screen.getByRole('button', { name: /export diagram as svg/i }))
    await waitFor(() => expect(mockExportSVG).toHaveBeenCalledTimes(1))
  })

  it('llama exportReport al clicar Report', async () => {
    render(<ExportButton />)
    fireEvent.click(screen.getByRole('button', { name: /export analysis report/i }))
    await waitFor(() => expect(mockExportReport).toHaveBeenCalledTimes(1))
  })
})

// ── estado durante export ─────────────────────────────────────────────────────

describe('ExportButton — estado durante export', () => {
  it('deshabilita todos los botones mientras exporta', async () => {
    let resolve!: () => void
    mockExportPNG.mockReturnValueOnce(new Promise<void>(r => { resolve = r }))

    render(<ExportButton />)
    fireEvent.click(screen.getByRole('button', { name: /export diagram as png/i }))

    await waitFor(() => {
      screen.getAllByRole('button').forEach(btn =>
        expect((btn as HTMLButtonElement).disabled).toBe(true),
      )
    })

    resolve()
    await waitFor(() => {
      screen.getAllByRole('button').forEach(btn =>
        expect((btn as HTMLButtonElement).disabled).toBe(false),
      )
    })
  })

  it('muestra "Exporting..." en el botón activo', async () => {
    let resolve!: () => void
    mockExportPNG.mockReturnValueOnce(new Promise<void>(r => { resolve = r }))

    render(<ExportButton />)
    fireEvent.click(screen.getByRole('button', { name: /export diagram as png/i }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /export diagram as png/i }).textContent).toContain('Exporting...'),
    )

    resolve()
  })
})

// ── manejo de errores ─────────────────────────────────────────────────────────

describe('ExportButton — errores', () => {
  it('muestra el mensaje de error cuando exportPNG rechaza', async () => {
    mockExportPNG.mockRejectedValueOnce(new Error('canvas error'))

    render(<ExportButton />)
    fireEvent.click(screen.getByRole('button', { name: /export diagram as png/i }))

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe('canvas error'),
    )
  })

  it('muestra "Export failed" para errores no-Error', async () => {
    mockExportPNG.mockRejectedValueOnce('string error')

    render(<ExportButton />)
    fireEvent.click(screen.getByRole('button', { name: /export diagram as png/i }))

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe('Export failed'),
    )
  })

  it('re-habilita los botones después de un error', async () => {
    mockExportPNG.mockRejectedValueOnce(new Error('fail'))

    render(<ExportButton />)
    fireEvent.click(screen.getByRole('button', { name: /export diagram as png/i }))

    await waitFor(() => screen.getByRole('alert'))
    screen.getAllByRole('button').forEach(btn =>
      expect((btn as HTMLButtonElement).disabled).toBe(false),
    )
  })
})
