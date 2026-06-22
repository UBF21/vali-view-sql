import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { BaseNodeCard } from './BaseNode'
import { NODE_COLORS, NODE_BG, getDiffBorder } from './node-utils'
import type { SQLNodeData } from '@/types'

export const ConditionNode = memo(function ConditionNode({ data, selected }: NodeProps<Node<SQLNodeData>>) {
  const c = NODE_COLORS.condition
  return (
    <div>
      <Handle type="target" position={Position.Top} style={{ top: -8, left: '50%', transform: 'rotate(-45deg)' }} />
      <Handle type="source" position={Position.Left} id="true" style={{ left: -8, top: '50%', transform: 'rotate(-45deg)' }} />
      <Handle type="source" position={Position.Right} id="false" style={{ right: -8, top: '50%', transform: 'rotate(-45deg)' }} />
      <BaseNodeCard
        nodeType="condition"
        label={data.label}
        detail={data.detail}
        clause={data.clause}
        accentColor={getDiffBorder(data, c.border)}
        textColor={c.text}
        bgColor={NODE_BG.condition}
        borderColor={c.border}
        isActive={data.isActive}
        selected={selected}
        diffStatus={data.diffStatus}
      />
    </div>
  )
})
