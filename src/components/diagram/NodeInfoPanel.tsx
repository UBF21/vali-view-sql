import { X, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Table2, GitMerge, Filter, Sigma, ArrowRight, ArrowUpDown, Hash,
  Layers, RefreshCcw, Database, Code2, Variable, Diamond, Repeat2, GitBranch,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { NodeType } from '@/types'
import { NODE_COLORS } from './nodes/node-utils'

// ─── Static definitions per node type ────────────────────────────────────────

const DEFINITIONS: Record<NodeType, {
  title: string
  definition: string
  pgDoc?: string
}> = {
  table: {
    title: 'Table Scan',
    definition: 'Reads all rows from a base table in the database. The table is loaded into the query pipeline as the initial data source.',
    pgDoc: 'https://www.postgresql.org/docs/current/ddl-basics.html',
  },
  join: {
    title: 'JOIN',
    definition: 'Combines rows from two relations based on a matching condition. Only rows where the ON condition is satisfied appear in the result.',
    pgDoc: 'https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-JOIN',
  },
  filter: {
    title: 'WHERE (Filter)',
    definition: 'Filters individual rows before any grouping occurs. Only rows satisfying the boolean condition pass through to the next step.',
    pgDoc: 'https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-WHERE',
  },
  aggregate: {
    title: 'GROUP BY / Aggregate',
    definition: 'Groups rows sharing common values and applies aggregate functions (COUNT, SUM, AVG…) to each group.',
    pgDoc: 'https://www.postgresql.org/docs/current/queries-aggregates.html',
  },
  output: {
    title: 'SELECT (Output)',
    definition: 'Selects and formats the output columns. Computed expressions, aliases, and DISTINCT filtering are applied here.',
    pgDoc: 'https://www.postgresql.org/docs/current/queries-select-lists.html',
  },
  sort: {
    title: 'ORDER BY (Sort)',
    definition: 'Sorts the result set by one or more expressions. ASC is the default direction; DESC reverses the order.',
    pgDoc: 'https://www.postgresql.org/docs/current/queries-order.html',
  },
  limit: {
    title: 'LIMIT / OFFSET',
    definition: 'Restricts the number of rows returned. OFFSET skips the first N rows before applying the LIMIT.',
    pgDoc: 'https://www.postgresql.org/docs/current/queries-limit.html',
  },
  subquery: {
    title: 'Subquery',
    definition: 'A nested SELECT used as a derived table or in a scalar context. It is evaluated independently before the outer query.',
    pgDoc: 'https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-SUBQUERIES',
  },
  setop: {
    title: 'Set Operation',
    definition: 'Combines results of two SELECT statements. UNION removes duplicates; UNION ALL keeps them. INTERSECT and EXCEPT filter accordingly.',
    pgDoc: 'https://www.postgresql.org/docs/current/queries-union.html',
  },
  cte: {
    title: 'CTE (WITH)',
    definition: 'A Common Table Expression defines a named temporary result set reusable within the query. Useful for readability and recursive queries.',
    pgDoc: 'https://www.postgresql.org/docs/current/queries-with.html',
  },
  temp_table: {
    title: 'Temporary Table',
    definition: 'A session-scoped table that exists only for the duration of the connection. Often used to stage intermediate results.',
    pgDoc: 'https://www.postgresql.org/docs/current/sql-createtable.html',
  },
  procedure: {
    title: 'Stored Procedure',
    definition: 'A named, reusable block of SQL logic stored in the database. Can accept parameters and perform multiple statements.',
    pgDoc: 'https://www.postgresql.org/docs/current/plpgsql.html',
  },
  param: {
    title: 'Parameter',
    definition: 'An input value passed to a stored procedure or function at call time.',
  },
  declare: {
    title: 'DECLARE (Variable)',
    definition: 'Declares a local variable within a procedural block. The variable can hold intermediate values during execution.',
    pgDoc: 'https://www.postgresql.org/docs/current/plpgsql-declarations.html',
  },
  condition: {
    title: 'Condition (IF/CASE)',
    definition: 'Evaluates a boolean expression and branches execution accordingly. Used in procedural logic to control flow.',
    pgDoc: 'https://www.postgresql.org/docs/current/plpgsql-control-structures.html',
  },
  loop: {
    title: 'LOOP',
    definition: 'Repeats a block of statements. Can iterate over a cursor, a range, or continue until a condition is met.',
    pgDoc: 'https://www.postgresql.org/docs/current/plpgsql-control-structures.html#PLPGSQL-CONTROL-STRUCTURES-LOOPS',
  },
}

const NODE_ICONS: Record<NodeType, React.ReactNode> = {
  table:      <Table2 size={16} />,
  join:       <GitMerge size={16} />,
  filter:     <Filter size={16} />,
  aggregate:  <Sigma size={16} />,
  output:     <ArrowRight size={16} />,
  sort:       <ArrowUpDown size={16} />,
  limit:      <Hash size={16} />,
  subquery:   <Layers size={16} />,
  setop:      <GitBranch size={16} />,
  cte:        <RefreshCcw size={16} />,
  temp_table: <Database size={16} />,
  procedure:  <Code2 size={16} />,
  param:      <ArrowRight size={16} />,
  declare:    <Variable size={16} />,
  condition:  <Diamond size={16} />,
  loop:       <Repeat2 size={16} />,
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function NodeInfoPanel() {
  const infoNode = useAppStore((s) => s.infoNode)
  const setInfoNode = useAppStore((s) => s.setInfoNode)

  return (
    <AnimatePresence>
      {infoNode && (
        <motion.div
          key="info-panel"
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          style={{
            position: 'fixed',
            top: 48,        /* below the header */
            right: 0,
            bottom: 0,
            width: 'min(340px, 100vw)',
            background: 'var(--surface)',
            borderLeft: '1px solid var(--border-hi)',
            zIndex: 50,
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.25)',
          }}
        >
          {/* Header */}
          {(() => {
            const def = DEFINITIONS[infoNode.nodeType]
            const colors = NODE_COLORS[infoNode.nodeType]
            return (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--elevated)',
                }}>
                  <span style={{ color: colors.text, display: 'flex', alignItems: 'center' }}>
                    {NODE_ICONS[infoNode.nodeType]}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: colors.text, flex: 1 }}>
                    {def.title}
                  </span>
                  <button
                    onClick={() => setInfoNode(null)}
                    aria-label="Close info panel"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-3)', padding: 4, display: 'flex', alignItems: 'center',
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* SQL clause */}
                {infoNode.clause && (
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                    <code style={{
                      display: 'block',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 12,
                      color: colors.text,
                      background: 'var(--elevated)',
                      border: `1px solid var(--border)`,
                      borderRadius: 6,
                      padding: '8px 12px',
                      lineHeight: 1.6,
                      wordBreak: 'break-word',
                    }}>
                      {infoNode.clause}
                    </code>
                  </div>
                )}

                {/* Definition */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                    definition
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.6, margin: 0 }}>
                    {def.definition}
                  </p>
                  {def.pgDoc && (
                    <a
                      href={def.pgDoc}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        marginTop: 10, fontSize: 12,
                        color: colors.text,
                        textDecoration: 'none',
                      }}
                    >
                      PostgreSQL Docs <ExternalLink size={12} />
                    </a>
                  )}
                </div>

                {/* In this query */}
                <div style={{ padding: '14px 16px' }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                    in this query
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.6, margin: 0 }}>
                    {infoNode.detail}
                  </p>
                </div>
              </>
            )
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
