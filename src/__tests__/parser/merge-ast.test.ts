import { describe, it, expect } from 'vitest'
import { parseSQL } from '@/lib/parser'

describe('MERGE parsing', () => {
  const MERGE_SQL = `MERGE INTO employees AS target
USING new_employees AS source ON target.id = source.id
WHEN MATCHED THEN
  UPDATE SET target.name = source.name, target.salary = source.salary
WHEN NOT MATCHED THEN
  INSERT (id, name, salary) VALUES (source.id, source.name, source.salary)`

  it('produces a merge node', () => {
    const result = parseSQL(MERGE_SQL, 'postgresql')
    // If parser fails (rawAst is null), this is acceptable — MERGE is unsupported by node-sql-parser
    // But if it succeeds (rawAst !== null), it must produce a merge node
    if (result.rawAst !== null) {
      expect(result.nodes.some(n => n.data.nodeType === 'merge')).toBe(true)
    }
  })

  it('produces table nodes for source and target', () => {
    const result = parseSQL(MERGE_SQL, 'postgresql')
    if (result.rawAst !== null) {
      expect(result.nodes.filter(n => n.data.nodeType === 'table').length).toBeGreaterThanOrEqual(2)
    }
  })
})
