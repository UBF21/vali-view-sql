import type { NodeType, SQLNodeData } from '@/types'

export const NODE_COLORS: Record<NodeType, {
  bg: string
  border: string
  text: string
  icon: string
}> = {
  table:      { bg: 'var(--n-table-bg)',  border: 'var(--n-table-b)',  text: 'var(--n-table)',  icon: '' },
  join:       { bg: 'var(--n-join-bg)',   border: 'var(--n-join-b)',   text: 'var(--n-join)',   icon: '' },
  filter:     { bg: 'var(--n-filter-bg)', border: 'var(--n-filter-b)', text: 'var(--n-filter)', icon: '' },
  aggregate:  { bg: 'var(--n-agg-bg)',    border: 'var(--n-agg-b)',    text: 'var(--n-agg)',    icon: '' },
  output:     { bg: 'var(--n-output-bg)', border: 'var(--n-output-b)', text: 'var(--n-output)', icon: '' },
  sort:       { bg: 'var(--n-sort-bg)',   border: 'var(--n-sort-b)',   text: 'var(--n-sort)',   icon: '' },
  limit:      { bg: 'var(--elevated)',    border: 'var(--border-hi)',   text: 'var(--text-2)',   icon: '' },
  subquery:   { bg: 'rgba(220,100,160,0.07)', border: 'rgba(220,100,160,0.35)', text: '#DC64A0', icon: '' },
  setop:      { bg: 'var(--elevated)',    border: 'var(--border-hi)',   text: 'var(--text-2)',   icon: '' },
  cte:        { bg: 'var(--n-join-bg)',   border: 'var(--n-join-b)',   text: 'var(--n-join)',   icon: '' },
  temp_table: { bg: 'var(--n-output-bg)', border: 'var(--n-output-b)', text: 'var(--n-output)', icon: '' },
  procedure:  { bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.35)',  text: '#8B8CF8', icon: '' },
  param:      { bg: 'rgba(129,140,248,0.07)', border: 'rgba(129,140,248,0.33)', text: '#818CF8', icon: '' },
  declare:    { bg: 'rgba(167,139,250,0.07)', border: 'rgba(167,139,250,0.33)', text: '#A78BFA', icon: '' },
  condition:  { bg: 'rgba(251,146,60,0.07)',  border: 'rgba(251,146,60,0.33)',  text: '#FB923C', icon: '' },
  loop:       { bg: 'rgba(251,113,133,0.07)', border: 'rgba(251,113,133,0.33)', text: '#FB7185', icon: '' },
  merge:      { bg: 'rgba(20,184,166,0.07)',  border: 'rgba(20,184,166,0.33)',  text: '#14B8A6', icon: '' },
  pivot:      { bg: 'rgba(139,92,246,0.07)',  border: 'rgba(139,92,246,0.33)',  text: '#8B5CF6', icon: '' },
  unpivot:    { bg: 'rgba(236,72,153,0.07)',  border: 'rgba(236,72,153,0.33)',  text: '#EC4899', icon: '' },
}

// Resolved background for BaseNode — uses CSS vars so light/dark mode works correctly
export const NODE_BG: Record<NodeType, string> = {
  table:      'var(--n-table-bg)',
  join:       'var(--n-join-bg)',
  filter:     'var(--n-filter-bg)',
  aggregate:  'var(--n-agg-bg)',
  output:     'var(--n-output-bg)',
  sort:       'var(--n-sort-bg)',
  limit:      'var(--elevated)',
  subquery:   'rgba(220,100,160,0.07)',
  setop:      'var(--elevated)',
  cte:        'var(--n-join-bg)',
  temp_table: 'var(--n-output-bg)',
  procedure:  'rgba(99,102,241,0.08)',
  param:      'rgba(129,140,248,0.07)',
  declare:    'rgba(167,139,250,0.07)',
  condition:  'rgba(251,146,60,0.07)',
  loop:       'rgba(251,113,133,0.07)',
  merge:      'rgba(20,184,166,0.07)',
  pivot:      'rgba(139,92,246,0.07)',
  unpivot:    'rgba(236,72,153,0.07)',
}

// Diff coloring helpers
export const DIFF_BORDER: Record<string, string> = {
  added:   '#22C55E',
  removed: '#EF4444',
  changed: '#EAB308',
  same:    '',
}

export function getDiffBorder(data: SQLNodeData, defaultBorder: string): string {
  if (data.diffStatus && data.diffStatus !== 'same') {
    return DIFF_BORDER[data.diffStatus] ?? defaultBorder
  }
  return data.hasIssue ? '#E24B4A' : defaultBorder
}
