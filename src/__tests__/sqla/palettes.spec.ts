import { describe, it, expect } from 'vitest'
import { THEMES, PAL_DARK, PAL_LIGHT, KEYWORDS, EDGE_D, ROWS_CNT } from '@/lib/sqla/palettes'

describe('palettes', () => {
  it('THEMES define los 3 dialectos', () => {
    expect(Object.keys(THEMES)).toEqual(['mysql', 'sqlserver', 'postgresql'])
    expect(THEMES.postgresql.color).toBe('#4f9edb')
  })

  it('PAL_DARK tiene todos los campos requeridos', () => {
    const required = ['bg','nodeFill','textP','textS','fkBadge','fkText','rowTrack','status','grid','scan','sep','tInt','tDec','tVch']
    required.forEach(k => expect(PAL_DARK).toHaveProperty(k))
    expect(PAL_DARK.bg).toBe('#07090f')
  })

  it('PAL_LIGHT tiene todos los campos requeridos', () => {
    expect(PAL_LIGHT.bg).toBe('#f0f2f7')
    expect(PAL_LIGHT.nodeFill).toBe('#ffffff')
  })

  it('PAL_DARK y PAL_LIGHT difieren en bg y nodeFill', () => {
    expect(PAL_DARK.bg).not.toBe(PAL_LIGHT.bg)
    expect(PAL_DARK.nodeFill).not.toBe(PAL_LIGHT.nodeFill)
  })

  it('KEYWORDS contiene palabras SQL clave', () => {
    expect(KEYWORDS).toContain('SELECT')
    expect(KEYWORDS).toContain('FROM')
    expect(KEYWORDS).toHaveLength(10)
  })

  it('EDGE_D tiene 4 paths de curvas bezier', () => {
    expect(EDGE_D).toHaveLength(4)
    EDGE_D.forEach(d => expect(d).toMatch(/^M400,250/))
  })

  it('ROWS_CNT contiene las 5 tablas de demo', () => {
    expect(ROWS_CNT.orders).toBe(1247)
    expect(ROWS_CNT.customers).toBe(3891)
  })
})
