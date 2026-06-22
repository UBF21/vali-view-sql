import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { BaseNodeCard } from './BaseNode'
import { NODE_COLORS, NODE_BG, getDiffBorder } from './node-utils'
import type { SQLNodeData } from '@/types'

export const SubqueryNode = memo(function SubqueryNode({ data, selected }: NodeProps<Node<SQLNodeData>>) {
  const c = NODE_COLORS.subquery
  return (
    <div>
      <Handle type="source" position={Position.Bottom} />
      <BaseNodeCard
        nodeType="subquery"
        label={data.label}
        detail={data.detail}
        clause={data.clause}
        accentColor={getDiffBorder(data, c.border)}
        textColor={c.text}
        bgColor={NODE_BG.subquery}
        borderColor={c.border}
        isActive={data.isActive}
        selected={selected}
        diffStatus={data.diffStatus}
      >
        {data.subGraph && (
          <div style={{ padding: '0 10px 8px 10px', fontSize: 10, color: c.text, opacity: 0.6, fontStyle: 'italic' }}>
            Click to expand
          </div>
        )}
      </BaseNodeCard>
    </div>
  )
})
