import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { BaseNodeCard } from './BaseNode'
import { NODE_COLORS, NODE_BG, getDiffBorder } from './node-utils'
import type { SQLNodeData } from '@/types'

export const ParamNode = memo(function ParamNode({ data, selected }: NodeProps<Node<SQLNodeData>>) {
  const c = NODE_COLORS.param
  return (
    <div>
      <Handle type="source" position={Position.Bottom} />
      <BaseNodeCard
        nodeType="param"
        label={data.label}
        detail={data.detail}
        clause={data.clause}
        accentColor={getDiffBorder(data, c.border)}
        textColor={c.text}
        bgColor={NODE_BG.param}
        borderColor={c.border}
        isActive={data.isActive}
        selected={selected}
        diffStatus={data.diffStatus}
      />
    </div>
  )
})
