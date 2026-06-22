import { describe, it, expect } from 'vitest'
import { T, R, buildSVG } from '@/lib/sqla/svg'
import { PAL_DARK, PAL_LIGHT, THEMES } from '@/lib/sqla/palettes'

describe('T()', () => {
  it('genera elemento text con coordenadas y texto', () => {
    const result = T(10, 20, 'hello')
    expect(result).toContain('x="10"')
    expect(result).toContain('y="20"')
    expect(result).toContain('hello')
  })

  it('incluye atributos extra', () => {
    const result = T(0, 0, 'x', { fill: '#fff', 'font-size': 12 })
    expect(result).toContain('fill="#fff"')
    expect(result).toContain('font-size="12"')
  })
})

describe('R()', () => {
  it('genera elemento rect con posicion y tamaño', () => {
    const result = R(5, 10, [100, 50])
    expect(result).toContain('x="5"')
    expect(result).toContain('y="10"')
    expect(result).toContain('width="100"')
    expect(result).toContain('height="50"')
  })

  it('incluye attrs adicionales', () => {
    const result = R(0, 0, [80, 40], { rx: 4, fill: 'red' })
    expect(result).toContain('rx="4"')
    expect(result).toContain('fill="red"')
  })
})

describe('buildSVG()', () => {
  it('incluye el id raiz y CSS vars del tema', () => {
    const svg = buildSVG(THEMES.postgresql, PAL_DARK)
    expect(svg).toContain('id="sqla-svg"')
    expect(svg).toContain('--sqla-c:#4f9edb')
  })

  it('incluye los 5 nodos de demo', () => {
    const svg = buildSVG(THEMES.postgresql, PAL_DARK)
    for (const id of ['orders', 'customers', 'order_items', 'products', 'categories']) {
      expect(svg).toContain(`id="sqla-node-${id}"`)
    }
  })

  it('incluye los 4 paths de edges', () => {
    const svg = buildSVG(THEMES.mysql, PAL_DARK)
    expect(svg).toContain('id="sqla-e0"')
    expect(svg).toContain('id="sqla-e3"')
  })

  it('modo light usa fondo claro en lugar del oscuro', () => {
    const light = buildSVG(THEMES.mysql, PAL_LIGHT)
    const dark  = buildSVG(THEMES.mysql, PAL_DARK)
    expect(light).toContain(PAL_LIGHT.bg)
    expect(dark).toContain(PAL_DARK.bg)
    expect(light).not.toContain(PAL_DARK.bg)
  })

  it('incluye el badge del dialecto', () => {
    const svg = buildSVG(THEMES.sqlserver, PAL_DARK)
    expect(svg).toContain('SQL Server')
  })
})
