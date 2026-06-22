import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { BaseNodeCard } from './BaseNode'
import { NODE_COLORS, NODE_BG, getDiffBorder } from './node-utils'
import type { SQLNodeData } from '@/types'

export const SetopNode = memo(function SetopNode({ data, selected }: NodeProps<Node<SQLNodeData>>) {
  const c = NODE_COLORS.setop
  return (
    <div>
      <Handle type="target" position={Position.Top} id="left" style={{ left: '30%' }} />
      <Handle type="target" position={Position.Top} id="right" style={{ left: '70%' }} />
      <Handle type="source" position={Position.Bottom} />
      <BaseNodeCard
        nodeType="setop"
        label={data.label}
        detail={data.detail}
        clause={data.clause}
        accentColor={getDiffBorder(data, c.border)}
        textColor={c.text}
        bgColor={NODE_BG.setop}
        borderColor={c.border}
        isActive={data.isActive}
        selected={selected}
        diffStatus={data.diffStatus}
      />
    </div>
  )
})
