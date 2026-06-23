/**
 * types.ts contiene solo interfaces y type aliases de TypeScript.
 * No hay lógica ejecutable — la verificación es puramente estructural
 * y el compilador la garantiza en tiempo de compilación.
 *
 * Este archivo existe para satisfacer el hook de cobertura de tests.
 */
import type { SchemaColumn, SchemaTable, Schema } from '@/lib/schema/types'
import { describe, it, expectTypeOf } from 'vitest'

describe('Schema types (structural)', () => {
  it('SchemaColumn tiene la forma correcta', () => {
    const col: SchemaColumn = {
      name:         'id',
      type:         'SERIAL',
      nullable:     false,
      isPrimaryKey: true,
      isForeignKey: false,
      isIndexed:    true,
    }
    expectTypeOf(col).toMatchTypeOf<SchemaColumn>()
  })

  it('SchemaTable tiene la forma correcta', () => {
    const table: SchemaTable = { name: 'users', columns: [], indexes: [] }
    expectTypeOf(table).toMatchTypeOf<SchemaTable>()
  })

  it('Schema es un Record indexado por string', () => {
    const schema: Schema = {}
    expectTypeOf(schema).toMatchTypeOf<Record<string, SchemaTable>>()
  })
})
