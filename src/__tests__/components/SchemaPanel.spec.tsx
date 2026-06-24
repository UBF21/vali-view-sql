// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { SchemaPanel } from '@/components/panels/SchemaPanel'
import type { Schema } from '@/lib/schema/types'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockLoadSchema  = vi.fn()
const mockClearSchema = vi.fn()

const storeState = {
  schema: null as Schema | null,
}

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (sel: (s: object) => unknown) =>
    sel({
      schema:      storeState.schema,
      loadSchema:  mockLoadSchema,
      clearSchema: mockClearSchema,
    }),
}))

vi.mock('@/lib/schema/schema-parser', () => ({
  parseSchema: vi.fn(),
}))

// ── Fixtures ───────────────────────────────────────────────────────────────────

const SCHEMA_ONE_TABLE: Schema = {
  users: {
    name: 'users',
    columns: [
      { name: 'id',    type: 'SERIAL',       nullable: false, isPrimaryKey: true,  isForeignKey: false, isIndexed: true  },
      { name: 'email', type: 'VARCHAR(255)',  nullable: false, isPrimaryKey: false, isForeignKey: false, isIndexed: true  },
      { name: 'bio',   type: 'TEXT',          nullable: true,  isPrimaryKey: false, isForeignKey: false, isIndexed: false },
    ],
    indexes: ['email'],
  },
}

const SCHEMA_TWO_TABLES: Schema = {
  users: {
    name:    'users',
    columns: [
      { name: 'id', type: 'SERIAL', nullable: false, isPrimaryKey: true, isForeignKey: false, isIndexed: true },
    ],
    indexes: [],
  },
  orders: {
    name:    'orders',
    columns: [
      { name: 'user_id', type: 'INTEGER', nullable: false, isPrimaryKey: false, isForeignKey: true, isIndexed: true },
    ],
    indexes: ['user_id'],
  },
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  storeState.schema = null
  vi.clearAllMocks()
})

afterEach(cleanup)

// ── Tests — estado vacío (SchemaEmpty) ────────────────────────────────────────

describe('SchemaPanel — estado vacío', () => {
  it('renderiza el placeholder de textarea cuando no hay schema', () => {
    render(<SchemaPanel />)
    expect(screen.getByPlaceholderText(/CREATE TABLE users/i)).toBeDefined()
  })

  it('renderiza el botón Load Schema', () => {
    render(<SchemaPanel />)
    expect(screen.getByRole('button', { name: /load schema/i })).toBeDefined()
  })

  it('muestra error si se intenta cargar con textarea vacío', () => {
    render(<SchemaPanel />)
    fireEvent.click(screen.getByRole('button', { name: /load schema/i }))
    expect(screen.getByText(/paste a create table statement first/i)).toBeDefined()
    expect(mockLoadSchema).not.toHaveBeenCalled()
  })

  it('llama loadSchema con el DDL ingresado al clicar Load Schema', () => {
    render(<SchemaPanel />)
    const textarea = screen.getByPlaceholderText(/CREATE TABLE users/i)
    fireEvent.change(textarea, { target: { value: 'CREATE TABLE t (id INT);' } })
    fireEvent.click(screen.getByRole('button', { name: /load schema/i }))
    expect(mockLoadSchema).toHaveBeenCalledWith('CREATE TABLE t (id INT);')
  })
})

// ── Tests — schema cargado (SchemaLoaded) ─────────────────────────────────────

describe('SchemaPanel — schema cargado (1 tabla)', () => {
  beforeEach(() => { storeState.schema = SCHEMA_ONE_TABLE })

  it('muestra el contador de tablas', () => {
    render(<SchemaPanel />)
    expect(screen.getByText(/1 table loaded/i)).toBeDefined()
  })

  it('renderiza el nombre de la tabla', () => {
    render(<SchemaPanel />)
    expect(screen.getByText('users')).toBeDefined()
  })

  it('renderiza el conteo de columnas', () => {
    render(<SchemaPanel />)
    expect(screen.getByText(/3 cols/i)).toBeDefined()
  })

  it('renderiza el botón Clear', () => {
    render(<SchemaPanel />)
    expect(screen.getByRole('button', { name: /clear schema/i })).toBeDefined()
  })

  it('llama clearSchema al clicar Clear', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<SchemaPanel />)
    fireEvent.click(screen.getByRole('button', { name: /clear schema/i }))
    expect(mockClearSchema).toHaveBeenCalledOnce()
  })

  it('no muestra columnas antes de expandir la tabla', () => {
    render(<SchemaPanel />)
    expect(screen.queryByText('email')).toBeNull()
  })

  it('expande la tabla al clicar el botón de tabla y muestra columnas', () => {
    render(<SchemaPanel />)
    // El botón toggle de la tabla muestra el nombre de la tabla
    fireEvent.click(screen.getByText('users'))
    expect(screen.getByText('email')).toBeDefined()
    expect(screen.getByText('id')).toBeDefined()
  })

  it('muestra el badge PK en la columna id', () => {
    render(<SchemaPanel />)
    fireEvent.click(screen.getByText('users'))
    expect(screen.getByText('PK')).toBeDefined()
  })

  it('muestra el badge IX en columnas indexadas (no PK)', () => {
    render(<SchemaPanel />)
    fireEvent.click(screen.getByText('users'))
    expect(screen.getByText('IX')).toBeDefined()
  })

  it('muestra "null" en columnas nullable', () => {
    render(<SchemaPanel />)
    fireEvent.click(screen.getByText('users'))
    expect(screen.getByText('null')).toBeDefined()
  })
})

describe('SchemaPanel — schema cargado (2 tablas)', () => {
  beforeEach(() => { storeState.schema = SCHEMA_TWO_TABLES })

  it('muestra "2 tables loaded" en plural', () => {
    render(<SchemaPanel />)
    expect(screen.getByText(/2 tables loaded/i)).toBeDefined()
  })

  it('renderiza ambos nombres de tabla', () => {
    render(<SchemaPanel />)
    expect(screen.getByText('users')).toBeDefined()
    expect(screen.getByText('orders')).toBeDefined()
  })

  it('muestra el badge FK al expandir orders', () => {
    render(<SchemaPanel />)
    fireEvent.click(screen.getByText('orders'))
    expect(screen.getByText('FK')).toBeDefined()
  })
})
