import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { BaseNodeCard } from './BaseNode'
import { NODE_COLORS, NODE_BG, getDiffBorder } from './node-utils'
import type { SQLNodeData } from '@/types'

export const MergeNode = memo(function MergeNode({ data, selected }: NodeProps<Node<SQLNodeData>>) {
  const c = NODE_COLORS.merge
  return (
    <div>
      <Handle type="target" position={Position.Top} id="source" style={{ left: '30%' }} />
      <Handle type="target" position={Position.Top} id="target" style={{ left: '70%' }} />
      <Handle type="source" position={Position.Bottom} />
      <BaseNodeCard
        nodeType="merge"
        label={data.label}
        detail={data.detail}
        clause={data.clause}
        accentColor={getDiffBorder(data, c.border)}
        textColor={c.text}
        bgColor={NODE_BG.merge}
        borderColor={c.border}
        isActive={data.isActive}
        selected={selected}
        diffStatus={data.diffStatus}
      />
    </div>
  )
})
