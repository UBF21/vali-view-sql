// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useExport } from '@/hooks/useExport'

// ── mocks ────────────────────────────────────────────────────────────────────

vi.mock('html-to-image', () => ({
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,ABC'),
  toSvg: vi.fn().mockResolvedValue('data:image/svg+xml;base64,XYZ'),
}))

vi.mock('@/lib/report/report-generator', () => ({
  generateReportHTML: vi.fn().mockReturnValue('<html>report</html>'),
}))

const storeState = {
  query: 'SELECT id FROM orders',
  dialect: 'postgresql' as const,
  issues: [],
  suggestions: [],
  columnLineage: [],
  complexityResult: null,
}

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (sel: (s: typeof storeState) => unknown) => sel(storeState),
}))

// ── helpers ──────────────────────────────────────────────────────────────────

function mockFlowEl(): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'react-flow'
  document.body.appendChild(el)
  return el
}

function mockLink() {
  const link = { href: '', download: '', click: vi.fn() }
  const original = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'a') return link as unknown as HTMLAnchorElement
    return original(tag)
  })
  return link
}

// ── tests ────────────────────────────────────────────────────────────────────

describe('useExport — canvasRef', () => {
  it('expone canvasRef como RefObject', () => {
    const { result } = renderHook(() => useExport())
    expect(result.current.canvasRef).toBeDefined()
    expect(result.current.canvasRef.current).toBeNull()
  })
})

describe('useExport — exportPNG', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('no lanza si no hay elemento en el DOM', async () => {
    const { result } = renderHook(() => useExport())
    await expect(act(() => result.current.exportPNG())).resolves.not.toThrow()
  })

  it('genera un link de descarga cuando hay .react-flow en el DOM', async () => {
    mockFlowEl()
    const link = mockLink()
    const { result } = renderHook(() => useExport())
    await act(() => result.current.exportPNG())
    expect(link.click).toHaveBeenCalled()
    expect(link.download).toMatch(/vali-view-sql-\d+\.png/)
    expect(link.href).toBe('data:image/png;base64,ABC')
  })

  it('propaga el error si toPng falla (sin try/catch)', async () => {
    const { toPng } = await import('html-to-image')
    vi.mocked(toPng).mockRejectedValueOnce(new Error('canvas error'))
    mockFlowEl()
    const { result } = renderHook(() => useExport())
    await expect(act(() => result.current.exportPNG())).rejects.toThrow('canvas error')
  })
})

describe('useExport — exportSVG', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('no lanza si no hay elemento en el DOM', async () => {
    const { result } = renderHook(() => useExport())
    await expect(act(() => result.current.exportSVG())).resolves.not.toThrow()
  })

  it('genera un link de descarga SVG cuando hay .react-flow', async () => {
    mockFlowEl()
    const link = mockLink()
    const { result } = renderHook(() => useExport())
    await act(() => result.current.exportSVG())
    expect(link.click).toHaveBeenCalled()
    expect(link.download).toMatch(/vali-view-sql-\d+\.svg/)
    expect(link.href).toBe('data:image/svg+xml;base64,XYZ')
  })

  it('propaga el error si toSvg falla (sin try/catch)', async () => {
    const { toSvg } = await import('html-to-image')
    vi.mocked(toSvg).mockRejectedValueOnce(new Error('svg error'))
    mockFlowEl()
    const { result } = renderHook(() => useExport())
    await expect(act(() => result.current.exportSVG())).rejects.toThrow('svg error')
  })
})

describe('useExport — exportReport', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('abre ventana nueva con el HTML del reporte', async () => {
    mockFlowEl()
    const fakeDoc = { write: vi.fn(), close: vi.fn() }
    const fakeWin = { document: fakeDoc }
    vi.spyOn(window, 'open').mockReturnValue(fakeWin as unknown as Window)

    const { result } = renderHook(() => useExport())
    await act(() => result.current.exportReport())

    expect(window.open).toHaveBeenCalledWith('', '_blank')
    expect(fakeDoc.write).toHaveBeenCalledWith('<html>report</html>')
    expect(fakeDoc.close).toHaveBeenCalled()
  })

  it('no lanza si window.open retorna null', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    const { result } = renderHook(() => useExport())
    await expect(act(() => result.current.exportReport())).resolves.not.toThrow()
  })

  it('continúa aunque falle la captura del diagrama', async () => {
    const { toPng } = await import('html-to-image')
    vi.mocked(toPng).mockRejectedValueOnce(new Error('canvas fail'))

    const fakeDoc = { write: vi.fn(), close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue({ document: fakeDoc } as unknown as Window)

    const { result } = renderHook(() => useExport())
    await expect(act(() => result.current.exportReport())).resolves.not.toThrow()
    expect(fakeDoc.write).toHaveBeenCalledWith('<html>report</html>')
  })
})
