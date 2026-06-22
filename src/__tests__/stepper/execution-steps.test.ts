import { describe, it, expect } from 'vitest'
import { buildSteps, decorateNodesForStep, decorateEdgesForStep } from '@/lib/stepper/execution-steps'
import { parseSQL } from '@/lib/parser'

describe('buildSteps — basic SELECT', () => {
  const sql = 'SELECT id, name FROM users WHERE active = true ORDER BY name'
  const result = parseSQL(sql, 'postgresql')

  it('returns steps in execution order', () => {
    const steps = buildSteps(result)
    expect(steps.length).toBeGreaterThan(0)
    // table debe ir antes que filter
    const tableStep = steps.findIndex(s =>
      result.nodes.find(n => n.id === s.nodeId)?.data.nodeType === 'table'
    )
    const filterStep = steps.findIndex(s =>
      result.nodes.find(n => n.id === s.nodeId)?.data.nodeType === 'filter'
    )
    expect(tableStep).toBeLessThan(filterStep)
  })

  it('each step has id, nodeId, title, description, edgeIds', () => {
    const steps = buildSteps(result)
    steps.forEach(step => {
      expect(step.id).toMatch(/^step-\d+$/)
      expect(step.nodeId).toBeTruthy()
      expect(step.title).toMatch(/^Step \d+: .+$/)
      expect(step.description).toBeTruthy()
      expect(Array.isArray(step.edgeIds)).toBe(true)
    })
  })

  it('output step comes after filter', () => {
    const steps = buildSteps(result)
    const outputStep = steps.findIndex(s =>
      result.nodes.find(n => n.id === s.nodeId)?.data.nodeType === 'output'
    )
    const filterIdx = steps.findIndex(s =>
      result.nodes.find(n => n.id === s.nodeId)?.data.nodeType === 'filter'
    )
    if (outputStep !== -1 && filterIdx !== -1) {
      expect(filterIdx).toBeLessThan(outputStep)
    }
  })

  it('sort step comes after output', () => {
    const steps = buildSteps(result)
    const sortIdx = steps.findIndex(s =>
      result.nodes.find(n => n.id === s.nodeId)?.data.nodeType === 'sort'
    )
    const outputIdx = steps.findIndex(s =>
      result.nodes.find(n => n.id === s.nodeId)?.data.nodeType === 'output'
    )
    if (sortIdx !== -1 && outputIdx !== -1) {
      expect(outputIdx).toBeLessThan(sortIdx)
    }
  })
})

describe('buildSteps — empty result', () => {
  it('returns empty array for empty parse result', () => {
    const empty = { nodes: [], edges: [], glossary: [], rawAst: null }
    expect(buildSteps(empty)).toEqual([])
  })
})

describe('decorateNodesForStep', () => {
  const sql = 'SELECT id FROM users WHERE active = true'
  const result = parseSQL(sql, 'postgresql')
  const steps = buildSteps(result)

  it('first step: active node has isActive=true, rest have isActive=false', () => {
    if (steps.length === 0) return
    const decorated = decorateNodesForStep(result, steps, 0)
    const activeNode = decorated.find(n => n.id === steps[0].nodeId)
    expect(activeNode?.data.isActive).toBe(true)
  })

  it('future nodes have isActive=false', () => {
    if (steps.length < 2) return
    const decorated = decorateNodesForStep(result, steps, 0)
    const futureNode = decorated.find(n => n.id === steps[steps.length - 1].nodeId)
    expect(futureNode?.data.isActive).toBe(false)
  })
})

describe('decorateEdgesForStep', () => {
  const sql = 'SELECT id FROM users WHERE active = true'
  const result = parseSQL(sql, 'postgresql')
  const steps = buildSteps(result)

  it('returns result.edges unchanged when steps is empty', () => {
    const decorated = decorateEdgesForStep(result, [], 0)
    expect(decorated).toEqual(result.edges)
  })

  it('active step edges are animated', () => {
    if (steps.length === 0) return
    const decorated = decorateEdgesForStep(result, steps, 0)
    const activeEdgeIds = new Set(steps[0].edgeIds)
    decorated.forEach(edge => {
      if (activeEdgeIds.has(edge.id ?? '')) {
        expect(edge.animated).toBe(true)
      } else {
        expect(edge.animated).toBe(false)
      }
    })
  })
})

describe('buildSteps — contextual descriptions', () => {
  it('filter step includes the WHERE clause in description', () => {
    const result = parseSQL('SELECT id FROM users WHERE active = true', 'postgresql')
    const steps = buildSteps(result)
    const filterStep = steps.find(s =>
      result.nodes.find(n => n.id === s.nodeId)?.data.nodeType === 'filter'
    )
    expect(filterStep).toBeDefined()
    expect(filterStep!.description).toContain('WHERE')
    expect(filterStep!.clause).toBeTruthy()
  })

  it('step has clause field matching node.data.clause', () => {
    const result = parseSQL('SELECT * FROM orders ORDER BY created_at DESC', 'postgresql')
    const steps = buildSteps(result)
    steps.forEach(step => {
      const node = result.nodes.find(n => n.id === step.nodeId)
      if (node?.data.clause) {
        expect(step.clause).toBe(node.data.clause)
      }
    })
  })
})

describe('buildSteps — JOIN + WHERE', () => {
  const sql = `
    SELECT u.id, o.total
    FROM users u
    JOIN orders o ON u.id = o.user_id
    WHERE o.total > 100
    ORDER BY o.total DESC
  `
  const result = parseSQL(sql, 'postgresql')

  it('generates steps containing table, join, filter, output, sort types', () => {
    const steps = buildSteps(result)
    const types = steps.map(s =>
      result.nodes.find(n => n.id === s.nodeId)?.data.nodeType
    )
    expect(types).toContain('table')
    expect(types).toContain('join')
    expect(types).toContain('filter')
    expect(types).toContain('output')
    expect(types).toContain('sort')
  })

  it('table comes before join, join before filter', () => {
    const steps = buildSteps(result)
    const idx = (type: string) => steps.findIndex(s =>
      result.nodes.find(n => n.id === s.nodeId)?.data.nodeType === type
    )
    expect(idx('table')).toBeLessThan(idx('join'))
    expect(idx('join')).toBeLessThan(idx('filter'))
  })
})
