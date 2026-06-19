import type { Node, Edge } from '@xyflow/react'

export type Dialect = 'postgresql' | 'mysql' | 'sqlserver'

export type NodeType =
  | 'table' | 'join' | 'filter' | 'aggregate'
  | 'output' | 'sort' | 'limit' | 'subquery' | 'setop'
  | 'cte' | 'temp_table' | 'procedure' | 'param' | 'declare'
  | 'condition' | 'loop'

export type AppMode = 'explain' | 'diff' | 'stepper'

export interface SQLNodeData extends Record<string, unknown> {
  nodeType: NodeType
  label: string
  detail: string
  clause: string
  lineStart?: number
  lineEnd?: number
  isActive?: boolean
  hasIssue?: boolean
  isHighlighted?: boolean
  diffStatus?: 'added' | 'removed' | 'changed' | 'same'
  subNodes?: Node<SQLNodeData>[]
  subEdges?: Edge[]
  conditionBranch?: 'true' | 'false'
  paramDirection?: 'IN' | 'OUT' | 'INOUT'
  subGraph?: { nodes: Node<SQLNodeData>[]; edges: Edge[] }
}

export interface GlossaryEntry {
  keyword: string
  role: string
  detail: string
  lineRef?: number
}

export interface ParseResult {
  nodes: Node<SQLNodeData>[]
  edges: Edge[]
  glossary: GlossaryEntry[]
  rawAst: unknown
}

export type IssueSeverity = 'error' | 'warning' | 'info'

export interface Issue {
  id: string
  severity: IssueSeverity
  title: string
  description: string
  suggestion: string
  nodeId?: string
  dialectNote?: string
  docUrl?: string
}

export interface Suggestion {
  id: string
  category: 'index' | 'rewrite' | 'dialect' | 'performance'
  title: string
  before: string
  after: string
  impact: 'high' | 'medium' | 'low'
  reason: string
}

export interface DiffResult {
  addedNodes: string[]
  removedNodes: string[]
  changedNodes: string[]
  summary: string
}

export interface Step {
  id: string
  nodeId: string
  title: string
  description: string
  edgeIds: string[]
}

export interface Example {
  id: string
  title: string
  dialect: Dialect
  category: 'basic' | 'join' | 'cte' | 'window' | 'subquery' | 'aggregation' | 'sp' | 'temp'
  sql: string
  description: string
}
