// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ComplexityBadge, LEVEL_COLOR } from '@/components/diagram/ComplexityBadge'
import type { ComplexityResult } from '@/lib/complexity/complexity-score'

const EMPTY_BREAKDOWN = {
  tableCount: 0, joinCount: 0, subqueryCount: 0,
  cteCount: 0,   setOpCount: 0, procedureCount: 0,
  aggregateCount: 0, conditionCount: 0, loopCount: 0,
}

const makeResult = (overrides: Partial<ComplexityResult> = {}): ComplexityResult => ({
  score: 2,
  level: 'Simple',
  breakdown: { ...EMPTY_BREAKDOWN },
  ...overrides,
})

let mockResult: ComplexityResult | null = null

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (sel: (s: { complexityResult: ComplexityResult | null }) => unknown) =>
    sel({ complexityResult: mockResult }),
}))

beforeEach(() => { mockResult = null })

describe('ComplexityBadge', () => {
  it('no renderiza nada cuando complexityResult es null', () => {
    const { container } = render(<ComplexityBadge />)
    expect(container.firstChild).toBeNull()
  })

  it('renderiza el badge con nivel y score cuando hay resultado', () => {
    mockResult = makeResult({ score: 2, level: 'Simple' })
    render(<ComplexityBadge />)
    expect(screen.getByText('Simple')).toBeDefined()
    expect(screen.getByText('2')).toBeDefined()
  })

  it('el botón tiene aria-label con el nivel de complejidad', () => {
    mockResult = makeResult({ score: 5, level: 'Moderate' })
    render(<ComplexityBadge />)
    expect(screen.getByRole('button', { name: /query complexity: moderate/i })).toBeDefined()
  })

  it('el panel de breakdown no está visible inicialmente', () => {
    mockResult = makeResult({ breakdown: { ...EMPTY_BREAKDOWN, tableCount: 2 } })
    render(<ComplexityBadge />)
    expect(screen.queryByText('Complexity Breakdown')).toBeNull()
  })

  it('abre el panel de breakdown al hacer click en el botón', () => {
    mockResult = makeResult({ breakdown: { ...EMPTY_BREAKDOWN, tableCount: 2 } })
    render(<ComplexityBadge />)
    fireEvent.click(screen.getByRole('button', { name: /query complexity/i }))
    expect(screen.getByText('Complexity Breakdown')).toBeDefined()
  })

  it('cierra el panel al hacer click por segunda vez', () => {
    mockResult = makeResult({ breakdown: { ...EMPTY_BREAKDOWN, tableCount: 1 } })
    render(<ComplexityBadge />)
    const btn = screen.getByRole('button', { name: /query complexity/i })
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(screen.queryByText('Complexity Breakdown')).toBeNull()
  })

  it('muestra solo las filas con count > 0 en el breakdown', () => {
    mockResult = makeResult({
      breakdown: { ...EMPTY_BREAKDOWN, tableCount: 2, joinCount: 1 },
    })
    render(<ComplexityBadge />)
    fireEvent.click(screen.getByRole('button', { name: /query complexity/i }))
    expect(screen.getByText('Tables × 2')).toBeDefined()
    expect(screen.getByText('JOINs × 1')).toBeDefined()
    expect(screen.queryByText(/Subqueries/)).toBeNull()
  })

  it('muestra el score total en el panel de breakdown', () => {
    mockResult = makeResult({ score: 7, level: 'Moderate', breakdown: { ...EMPTY_BREAKDOWN, joinCount: 7 } })
    render(<ComplexityBadge />)
    fireEvent.click(screen.getByRole('button', { name: /query complexity/i }))
    expect(screen.getByText('Total score')).toBeDefined()
    // score aparece tanto en badge como en panel
    expect(screen.getAllByText('7').length).toBeGreaterThanOrEqual(1)
  })

  it('usa el color correcto para cada nivel', () => {
    const levels = ['Simple', 'Moderate', 'Complex', 'Very Complex'] as const
    levels.forEach(level => {
      expect(LEVEL_COLOR[level]).toBeDefined()
      expect(LEVEL_COLOR[level]).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })
  })

  it('renderiza con nivel Very Complex', () => {
    mockResult = makeResult({ score: 20, level: 'Very Complex' })
    render(<ComplexityBadge />)
    expect(screen.getByText('Very Complex')).toBeDefined()
    expect(screen.getByText('20')).toBeDefined()
  })
})
