import type { NodeType } from '@/types'
import { TableNode } from './TableNode'
import { JoinNode } from './JoinNode'
import { FilterNode } from './FilterNode'
import { AggregateNode } from './AggregateNode'
import { OutputNode } from './OutputNode'
import { SortNode } from './SortNode'
import { LimitNode } from './LimitNode'

export const NODE_COLORS: Record<NodeType, {
  bg: string
  border: string
  text: string
  icon: string
  borderStyle?: string
}> = {
  table:     { bg: '#E1F5EE', border: '#5DCAA5', text: '#085041', icon: '⊞' },
  join:      { bg: '#EEEDFE', border: '#AFA9EC', text: '#3C3489', icon: '⋈' },
  filter:    { bg: '#FAEEDA', border: '#EF9F27', text: '#412402', icon: '▽' },
  aggregate: { bg: '#FAECE7', border: '#F0997B', text: '#712B13', icon: '∑' },
  output:    { bg: '#E6F1FB', border: '#85B7EB', text: '#0C447C', icon: '→' },
  sort:      { bg: '#EEEDFE', border: '#AFA9EC', text: '#3C3489', icon: '↕' },
  limit:     { bg: '#F1EFE8', border: '#B4B2A9', text: '#444441', icon: '#' },
  subquery:  { bg: '#FBEAF0', border: '#ED93B1', text: '#72243E', icon: '⊂' },
  setop:     { bg: '#F1EFE8', border: '#B4B2A9', text: '#444441', icon: '∪' },
  cte:       { bg: '#F0EEFF', border: '#8B7CF8', text: '#3B2F8A', icon: '⟳' },
  temp_table:{ bg: '#E8F4F0', border: '#5DCAA5', text: '#085041', icon: '⊡', borderStyle: 'dashed' },
  procedure: { bg: '#1A1A2E', border: '#6366F1', text: '#E0E7FF', icon: 'λ' },
  param:     { bg: '#EEF2FF', border: '#818CF8', text: '#312E81', icon: '→' },
  declare:   { bg: '#F5F3FF', border: '#A78BFA', text: '#4C1D95', icon: '$' },
  condition: { bg: '#FFF7ED', border: '#FB923C', text: '#7C2D12', icon: '◇' },
  loop:      { bg: '#FFF1F2', border: '#FB7185', text: '#881337', icon: '↺' },
}

export const customNodeTypes = {
  tableNode: TableNode,
  joinNode: JoinNode,
  filterNode: FilterNode,
  aggregateNode: AggregateNode,
  outputNode: OutputNode,
  sortNode: SortNode,
  limitNode: LimitNode,
}
