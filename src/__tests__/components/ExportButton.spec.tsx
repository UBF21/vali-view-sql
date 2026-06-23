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

// ── setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

// ── tests ─────────────────────────────────────────────────────────────────────

describe('ExportButton — renderizado', () => {
  it('muestra los tres botones', () => {
    render(<ExportButton />)
    expect(screen.getByRole('button', { name: /export diagram as png/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /export diagram as svg/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /export analysis report/i })).toBeDefined()
  })

  it('los botones están habilitados por defecto', () => {
    render(<ExportButton />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach(btn => expect((btn as HTMLButtonElement).disabled).toBe(false))
  })
})

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
})
