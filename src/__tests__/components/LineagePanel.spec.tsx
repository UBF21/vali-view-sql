// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { LineagePanel } from '@/components/panels/LineagePanel'
import type { ColumnLineage } from '@/lib/lineage/column-lineage'

// ── Mock store ─────────────────────────────────────────────────────────────────

const storeState = {
  columnLineage: [] as ColumnLineage,
}

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (sel: (s: object) => unknown) =>
    sel({ columnLineage: storeState.columnLineage }),
}))

// ── Fixtures ───────────────────────────────────────────────────────────────────

const SINGLE_COL: ColumnLineage = [
  { outputAlias: 'name', sources: [{ table: 'users', column: 'name' }] },
]

const MULTI_COL: ColumnLineage = [
  { outputAlias: 'id',    sources: [{ table: 'users', column: 'id' }] },
  { outputAlias: 'email', sources: [{ table: 'users', column: 'email' }] },
]

const WITH_EXPR: ColumnLineage = [
  {
    outputAlias: 'total',
    expression:  'SUM(orders.amount)',
    sources:     [{ table: 'orders', column: 'amount' }],
  },
]

const NO_TABLE_SOURCE: ColumnLineage = [
  { outputAlias: 'status', sources: [{ table: '', column: 'status' }] },
]

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  storeState.columnLineage = []
  vi.clearAllMocks()
})

afterEach(cleanup)

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('LineagePanel — estado vacío', () => {
  it('muestra el mensaje vacío cuando no hay lineage', () => {
    render(<LineagePanel />)
    expect(screen.getByText(/no lineage data/i)).toBeDefined()
  })

  it('no renderiza la tabla cuando lineage está vacío', () => {
    render(<LineagePanel />)
    expect(screen.queryByRole('table')).toBeNull()
  })
})

describe('LineagePanel — contador de columnas', () => {
  it('muestra "1 output column traced" en singular', () => {
    storeState.columnLineage = SINGLE_COL
    render(<LineagePanel />)
    expect(screen.getByText(/1 output column traced/i)).toBeDefined()
  })

  it('muestra "2 output columns traced" en plural', () => {
    storeState.columnLineage = MULTI_COL
    render(<LineagePanel />)
    expect(screen.getByText(/2 output columns traced/i)).toBeDefined()
  })
})

describe('LineagePanel — encabezados de tabla', () => {
  it('renderiza los tres encabezados de columna', () => {
    storeState.columnLineage = SINGLE_COL
    render(<LineagePanel />)
    expect(screen.getByText('Output')).toBeDefined()
    expect(screen.getByText('Expression')).toBeDefined()
    expect(screen.getByText('Source(s)')).toBeDefined()
  })
})

describe('LineagePanel — filas de lineage', () => {
  it('renderiza el outputAlias de cada entrada', () => {
    storeState.columnLineage = MULTI_COL
    render(<LineagePanel />)
    // Both outputAlias and source column render the same text — use getAllByText
    expect(screen.getAllByText('id').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('email').length).toBeGreaterThanOrEqual(1)
  })

  it('renderiza la expresión cuando está presente', () => {
    storeState.columnLineage = WITH_EXPR
    render(<LineagePanel />)
    expect(screen.getByText('SUM(orders.amount)')).toBeDefined()
  })

  it('muestra "—" cuando no hay expresión', () => {
    storeState.columnLineage = SINGLE_COL
    render(<LineagePanel />)
    expect(screen.getByText('—')).toBeDefined()
  })

  it('renderiza table.column cuando la fuente tiene tabla', () => {
    storeState.columnLineage = SINGLE_COL
    render(<LineagePanel />)
    // "users." is a text node sibling of the column span
    expect(screen.getByText(/users\./)).toBeDefined()
    // "name" appears in both outputAlias cell and source span
    expect(screen.getAllByText('name').length).toBeGreaterThanOrEqual(1)
  })

  it('renderiza solo el nombre de columna cuando no hay tabla', () => {
    storeState.columnLineage = NO_TABLE_SOURCE
    render(<LineagePanel />)
    // "status" appears in both outputAlias cell and source span — no table prefix dot
    expect(screen.getAllByText('status').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText(/users\./)).toBeNull()
  })
})
