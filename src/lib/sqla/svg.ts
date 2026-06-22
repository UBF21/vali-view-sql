import type { Theme, Palette } from './palettes'
import { EDGE_D } from './palettes'

type Attrs = Record<string, string | number>
const MF = 'JetBrains Mono,monospace'
const HALO_POS = [['orders','400','250'],['customers','132','106'],['order_items','668','106'],['products','668','386'],['categories','132','386']] as const
const DOT_POS  = [['132','106'],['668','106'],['668','386'],['132','386']] as const

export function T(x: number, y: number, txt: string, opts: Attrs = {}): string {
  const a = Object.entries(opts).map(([k, v]) => `${k}="${v}"`).join(' ')
  return `<text x="${x}" y="${y}" font-family="${MF}" ${a}>${txt}</text>`
}

export function R(x: number, y: number, sz: [number, number], attrs: Attrs = {}): string {
  const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')
  return `<rect x="${x}" y="${y}" width="${sz[0]}" height="${sz[1]}" ${a}/>`
}

function PK(bx: number, by: number): string {
  return R(bx, by, [16, 10], { rx: 2, style: 'fill:var(--sqla-c);opacity:.9;' })
       + T(bx + 2, by + 8, 'PK', { 'font-size': 6.5, 'font-weight': 700, fill: '#fff' })
}

function nodeHeader(nx: number, ny: number, id: string, pal: Palette): string {
  return [
    `<path d="M${nx+8},${ny} Q${nx},${ny} ${nx},${ny+8} L${nx},${ny+28} L${nx+160},${ny+28} L${nx+160},${ny+8} Q${nx+160},${ny} ${nx+152},${ny} Z" style="fill:var(--sqla-h);"/>`,
    `<circle cx="${nx+17}" cy="${ny+14}" r="4" style="fill:var(--sqla-c);"/>`,
    `<text id="sqla-tn-${id}" x="${nx+28}" y="${ny+19}" font-family="${MF}" font-size="11" font-weight="600" fill="${pal.textP}">${id}</text>`,
    `<line x1="${nx}" y1="${ny+28}" x2="${nx+160}" y2="${ny+28}" stroke="${pal.sep}" stroke-width="1"/>`,
  ].join('')
}

function buildEdgeLabel(id: number, pos: [number, number, number, number], txt: string, delay: string): string {
  const [rx, ry, tx, ty] = pos
  return `<g id="sqla-el${id}" style="opacity:0;transition:opacity .45s ease ${delay};">`
       + R(rx, ry, [76, 14], { rx: 4, style: 'fill:var(--sqla-h);stroke:var(--sqla-c);stroke-width:.7;' })
       + T(tx, ty, txt, { 'font-size': 8, 'font-weight': 600, 'text-anchor': 'middle', 'letter-spacing': '.4', style: 'fill:var(--sqla-c);' })
       + '</g>'
}

function mkHelpers(pal: Palette) {
  const FK = (bx: number, by: number): string =>
    R(bx, by, [14, 10], { rx: 2, fill: pal.fkBadge, opacity: 0.85 })
    + T(bx + 2, by + 8, 'FK', { 'font-size': 6.5, 'font-weight': 700, fill: pal.fkText })

  const col = (pos: [number, number], nm: string, tp: string, tc: string): string =>
    T(pos[0], pos[1], nm, { 'font-size': 9, fill: pal.textS })
    + T(pos[0] + 118, pos[1], tp, { 'font-size': 8, fill: tc })

  const colPK = (bx: number, by: number, nx: number, nm: string): string =>
    PK(bx, by) + T(nx, by + 8, nm, { 'font-size': 9, fill: pal.textP })

  const colFK = (bx: number, by: number, nx: number, opts: { nm: string; tp: string; tc?: string }): string =>
    FK(bx, by)
    + T(nx, by + 8, opts.nm, { 'font-size': 9, fill: pal.textS })
    + T(nx + 118, by + 8, opts.tp, { 'font-size': 8, fill: opts.tc ?? pal.tInt })

  const buildNode = (id: string, pos: [number, number], barW: number, cols: string[]): string => {
    const [nx, ny] = pos
    return [
      `<g id="sqla-node-${id}" style="opacity:0;transform-box:fill-box;transform-origin:center;">`,
      R(nx, ny, [160, 128], { rx: 8, style: `fill:${pal.nodeFill};stroke:var(--sqla-c);stroke-width:1.5;` }),
      nodeHeader(nx, ny, id, pal),
      ...cols,
      `<text id="sqla-rows-${id}" x="${nx+9}" y="${ny+99}" font-family="${MF}" font-size="7.5" font-style="italic" fill="${pal.textS}" opacity=".55">~0 rows</text>`,
      R(nx + 9, ny + 110, [142, 4], { rx: 2, fill: pal.rowTrack }),
      R(nx + 9, ny + 110, [barW, 4], { rx: 2, style: 'fill:var(--sqla-c);opacity:.45;' }),
      '</g>',
    ].join('')
  }

  return { col, colPK, colFK, buildNode }
}

function buildAllNodes(pal: Palette): string {
  const { col, colPK, colFK, buildNode } = mkHelpers(pal)
  const p = pal
  return [
    buildNode('orders',      [320, 186], 71, [colPK(329,218,349,'id')+T(440,226,'INT',{'font-size':8,fill:p.tInt}), colFK(329,232,349,{nm:'customer_id',tp:'INT'}), col([349,254],'total','DEC',p.tDec), col([349,268],'status','VCH',p.tVch)]),
    buildNode('customers',    [52,  42], 90, [colPK( 61, 74, 81,'id')+T(172, 82,'INT',{'font-size':8,fill:p.tInt}), col([81, 96],'name','VCH',p.tVch), col([81,110],'email','VCH',p.tVch), col([81,124],'phone','VCH',p.tVch)]),
    buildNode('order_items', [588,  42], 48, [colPK(597, 74,617,'id')+T(708, 82,'INT',{'font-size':8,fill:p.tInt}), colFK(597,88,615,{nm:'order_id',tp:'INT'}), colFK(597,102,615,{nm:'product_id',tp:'INT'}), col([617,124],'qty','INT',p.tInt)]),
    buildNode('products',    [588, 322], 72, [colPK(597,354,617,'id')+T(708,362,'INT',{'font-size':8,fill:p.tInt}), col([617,376],'name','VCH',p.tVch), col([617,390],'price','DEC',p.tDec), colFK(597,396,615,{nm:'category_id',tp:'INT'})]),
    buildNode('categories',   [52, 322], 30, [colPK( 61,354, 81,'id')+T(172,362,'INT',{'font-size':8,fill:p.tInt}), col([81,376],'name','VCH',p.tVch), col([81,390],'slug','VCH',p.tVch), col([81,404],'icon','VCH',p.tVch)]),
  ].join('')
}

function buildDefs(pal: Palette): string {
  return '<defs>'
    + `<pattern id="sqla-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0L0 0 0 40" fill="none" stroke="${pal.grid}" stroke-width=".55"/></pattern>`
    + '<filter id="sqla-f2"  x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceGraphic" stdDeviation="2"/></filter>'
    + '<filter id="sqla-f5"  x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur in="SourceGraphic" stdDeviation="5"/></filter>'
    + '<filter id="sqla-f14" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur in="SourceGraphic" stdDeviation="14"/></filter>'
    + '</defs>'
}

function buildEdgePaths(): string {
  const glows = EDGE_D.map((d, i) => `<path id="sqla-eg${i}" d="${d}" fill="none" stroke-width="10" stroke-linecap="round" stroke-dasharray="640" stroke-dashoffset="640" style="stroke:var(--sqla-c);opacity:0;filter:url(#sqla-f5);"/>`).join('')
  const mains = EDGE_D.map((d, i) => `<path id="sqla-e${i}"  d="${d}" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="640" stroke-dashoffset="640" style="stroke:var(--sqla-c);opacity:0;"/>`).join('')
  const dots  = DOT_POS.map((p, i) => `<circle id="sqla-edot-${i}" cx="${p[0]}" cy="${p[1]}" r="0" style="fill:var(--sqla-c);opacity:0;filter:url(#sqla-f2);"/>`).join('')
  return glows + mains + dots
}

function buildEdgeLabels(): string {
  return [
    buildEdgeLabel(0, [215, 172, 253, 182], 'INNER JOIN', '0s'),
    buildEdgeLabel(1, [509, 172, 547, 182], 'LEFT JOIN',  '.08s'),
    buildEdgeLabel(2, [495, 273, 533, 283], 'LEFT JOIN',  '.14s'),
    buildEdgeLabel(3, [228, 273, 266, 283], 'INNER JOIN', '.06s'),
  ].join('')
}

export function buildSVG(theme: Theme, pal: Palette): string {
  const { color: c, header: h, name: n } = theme
  return [
    `<svg id="sqla-svg" viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:100%;--sqla-c:${c};--sqla-h:${h};">`,
    buildDefs(pal),
    R(0, 0, [800, 480], { fill: pal.bg }),
    R(0, 0, [800, 480], { fill: 'url(#sqla-grid)' }),
    `<ellipse cx="400" cy="250" rx="230" ry="155" style="fill:var(--sqla-c);opacity:.025;animation:sqla-glow 3.5s ease-in-out infinite;"/>`,
    HALO_POS.map(p => `<ellipse id="sqla-halo-${p[0]}" cx="${p[1]}" cy="${p[2]}" rx="88" ry="62" style="fill:var(--sqla-c);opacity:0;filter:url(#sqla-f14);transition:opacity .9s ease;"/>`).join(''),
    '<circle id="sqla-hub-ring" cx="400" cy="250" r="12" fill="none" stroke-width="1" style="stroke:var(--sqla-c);opacity:0;transition:opacity .35s ease;"/>',
    '<circle id="sqla-hub-dot"  cx="400" cy="250" r="5" style="fill:var(--sqla-c);opacity:0;transition:opacity .35s ease;"/>',
    buildEdgePaths(),
    buildEdgeLabels(),
    buildAllNodes(pal),
    R(684, 11, [104, 22], { rx: 5, style: 'fill:var(--sqla-h);stroke:var(--sqla-c);stroke-width:.8;' }),
    T(736, 25.5, n, { 'font-size': 9.5, 'font-weight': 600, 'text-anchor': 'middle', 'letter-spacing': '.4', style: 'fill:var(--sqla-c);' }),
    `<text id="sqla-status" x="400" y="466" font-family="${MF}" font-size="9.5" text-anchor="middle" fill="${pal.status}" opacity=".35">analyzing SQL...</text>`,
    '</svg>',
  ].join('')
}
