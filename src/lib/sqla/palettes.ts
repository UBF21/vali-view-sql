export type DbType = 'mysql' | 'sqlserver' | 'postgresql'

export interface Theme {
  name: string
  color: string
  header: string
}

export interface Palette {
  bg: string; nodeFill: string; textP: string; textS: string
  fkBadge: string; fkText: string; rowTrack: string; status: string
  grid: string; scan: string; sep: string
  tInt: string; tDec: string; tVch: string
}

export const THEMES: Record<DbType, Theme> = {
  mysql:      { name: 'MySQL',      color: '#f97316', header: 'rgba(249,115,22,0.11)' },
  sqlserver:  { name: 'SQL Server', color: '#0078d4', header: 'rgba(0,120,212,0.11)'  },
  postgresql: { name: 'PostgreSQL', color: '#4f9edb', header: 'rgba(79,158,219,0.11)' },
}

export const PAL_DARK: Palette = {
  bg: '#07090f',   nodeFill: '#0d1117', textP: '#e6edf3', textS: '#8b949e',
  fkBadge: '#484f58', fkText: '#8b949e', rowTrack: '#161b22', status: '#3d4456',
  grid: 'rgba(255,255,255,.04)', scan: 'rgba(255,255,255,.013)', sep: '#1c2128',
  tInt: '#7ee787', tDec: '#e3b341', tVch: '#79c0ff',
}

export const PAL_LIGHT: Palette = {
  bg: '#f0f2f7',   nodeFill: '#ffffff', textP: '#1a1f2e', textS: '#64748b',
  fkBadge: '#e2e8f0', fkText: '#64748b', rowTrack: '#e2e8f0', status: '#94a3b8',
  grid: 'rgba(0,0,0,.05)', scan: 'rgba(0,0,0,.04)', sep: '#e2e8f0',
  tInt: '#16a34a', tDec: '#d97706', tVch: '#2563eb',
}

export const KEYWORDS = ['SELECT','FROM','INNER JOIN','LEFT JOIN','WHERE','ON','GROUP BY','ORDER BY','AS','DISTINCT']
export const KW_POS   = [[10,15],[32,68],[6,84],[68,10],[60,74],[84,38],[40,88],[75,6],[50,50],[18,94]]
export const ROWS_CNT: Record<string, number> = {
  orders: 1247, customers: 3891, order_items: 4523, products: 312, categories: 28,
}
export const EDGE_D = [
  'M400,250 C360,195 225,138 132,106',
  'M400,250 C440,195 575,138 668,106',
  'M400,250 C440,308 575,362 668,386',
  'M400,250 C360,308 225,362 132,386',
]
