// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/hooks/useExport', () => ({
  useExport: () => ({
    exportPNG: vi.fn().mockRejectedValue(new Error('canvas error')),
    exportSVG: vi.fn(),
    exportReport: vi.fn(),
  }),
}))

vi.mock('@/store/useAppStore', () => ({
  useAppStore: vi.fn(),
}))

import { useAppStore } from '@/store/useAppStore'
import { ExportButton } from '@/components/diagram/ExportButton'

function renderWithNodes(nodeCount: number) {
  vi.mocked(useAppStore).mockImplementation(
    (sel: (s: { parseResult: { nodes: unknown[] } | null }) => unknown) =>
      sel({ parseResult: nodeCount > 0 ? { nodes: new Array(nodeCount).fill({}) } : null }),
  )
  return render(<ExportButton />)
}

describe('ExportButton', () => {
  beforeEach(() => vi.clearAllMocks())

  it('disables PNG and SVG when diagram is empty', () => {
    renderWithNodes(0)
    const buttons = screen.getAllByRole('button') as HTMLButtonElement[]
    expect(buttons[0].disabled).toBe(true)
    expect(buttons[1].disabled).toBe(true)
    expect(buttons[2].disabled).toBe(false)
  })

  it('enables all buttons when diagram has nodes', () => {
    renderWithNodes(2)
    screen.getAllByRole('button').forEach(btn =>
      expect((btn as HTMLButtonElement).disabled).toBe(false),
    )
  })

  it('shows "Diagram is empty" title on disabled PNG button', () => {
    renderWithNodes(0)
    const [png] = screen.getAllByRole('button')
    expect(png.title).toBe('Diagram is empty — type a SQL query first')
  })
})
