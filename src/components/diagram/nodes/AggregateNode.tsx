import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { BaseNodeCard } from './BaseNode'
import { NODE_COLORS, NODE_BG, getDiffBorder } from './node-utils'
import type { SQLNodeData } from '@/types'

export const AggregateNode = memo(function AggregateNode({ data, selected }: NodeProps<Node<SQLNodeData>>) {
  const c = NODE_COLORS.aggregate
  return (
    <div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <BaseNodeCard
        nodeType="aggregate"
        label={data.label}
        detail={data.detail}
        clause={data.clause}
        accentColor={getDiffBorder(data, c.border)}
        textColor={c.text}
        bgColor={NODE_BG.aggregate}
        borderColor={c.border}
        isActive={data.isActive}
        selected={selected}
        diffStatus={data.diffStatus}
      />
    </div>
  )
})
