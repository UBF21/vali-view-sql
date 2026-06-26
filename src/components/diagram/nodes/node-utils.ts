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
  limit:      { bg: 'var(--elevated)',       border: 'var(--border-hi)',    text: 'var(--text-2)',    icon: '' },
  subquery:   { bg: 'var(--n-subquery-bg)', border: 'var(--n-subquery-b)', text: 'var(--n-subquery)', icon: '' },
  setop:      { bg: 'var(--elevated)',       border: 'var(--border-hi)',    text: 'var(--text-2)',    icon: '' },
  cte:        { bg: 'var(--n-join-bg)',      border: 'var(--n-join-b)',     text: 'var(--n-join)',    icon: '' },
  temp_table: { bg: 'var(--n-output-bg)',   border: 'var(--n-output-b)',   text: 'var(--n-output)',  icon: '' },
  procedure:  { bg: 'var(--n-proc-bg)',     border: 'var(--n-proc-b)',     text: 'var(--n-proc)',    icon: '' },
  param:      { bg: 'var(--n-param-bg)',    border: 'var(--n-param-b)',    text: 'var(--n-param)',   icon: '' },
  declare:    { bg: 'var(--n-declare-bg)',  border: 'var(--n-declare-b)',  text: 'var(--n-declare)', icon: '' },
  condition:  { bg: 'var(--n-cond-bg)',     border: 'var(--n-cond-b)',     text: 'var(--n-cond)',    icon: '' },
  loop:       { bg: 'var(--n-loop-bg)',     border: 'var(--n-loop-b)',     text: 'var(--n-loop)',    icon: '' },
  merge:      { bg: 'var(--n-merge-bg)',    border: 'var(--n-merge-b)',    text: 'var(--n-merge)',   icon: '' },
  pivot:      { bg: 'var(--n-pivot-bg)',    border: 'var(--n-pivot-b)',    text: 'var(--n-pivot)',   icon: '' },
  unpivot:    { bg: 'var(--n-unpivot-bg)', border: 'var(--n-unpivot-b)', text: 'var(--n-unpivot)', icon: '' },
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
  subquery:   'var(--n-subquery-bg)',
  setop:      'var(--elevated)',
  cte:        'var(--n-join-bg)',
  temp_table: 'var(--n-output-bg)',
  procedure:  'var(--n-proc-bg)',
  param:      'var(--n-param-bg)',
  declare:    'var(--n-declare-bg)',
  condition:  'var(--n-cond-bg)',
  loop:       'var(--n-loop-bg)',
  merge:      'var(--n-merge-bg)',
  pivot:      'var(--n-pivot-bg)',
  unpivot:    'var(--n-unpivot-bg)',
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
