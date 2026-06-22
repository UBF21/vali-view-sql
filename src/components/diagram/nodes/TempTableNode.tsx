import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { BaseNodeCard } from './BaseNode'
import { NODE_COLORS, NODE_BG, getDiffBorder } from './node-utils'
import type { SQLNodeData } from '@/types'

export const TempTableNode = memo(function TempTableNode({ data, selected }: NodeProps<Node<SQLNodeData>>) {
  const c = NODE_COLORS.temp_table
  return (
    <div>
      <Handle type="source" position={Position.Bottom} />
      <BaseNodeCard
        nodeType="temp_table"
        label={data.label}
        detail={data.detail}
        accentColor={getDiffBorder(data, c.border)}
        textColor={c.text}
        bgColor={NODE_BG.temp_table}
        borderColor={c.border}
        isActive={data.isActive}
        selected={selected}
        diffStatus={data.diffStatus}
      />
    </div>
  )
})
