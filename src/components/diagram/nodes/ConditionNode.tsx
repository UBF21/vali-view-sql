import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { NODE_COLORS } from './index'
import type { SQLNodeData } from '@/types'

export const ConditionNode = memo(function ConditionNode({ data, selected }: NodeProps<Node<SQLNodeData>>) {
  const colors = NODE_COLORS.condition
  return (
    <div style={{
      width: 120, height: 120,
      transform: 'rotate(45deg)',
      background: colors.bg,
      border: `2px solid ${colors.border}`,
      borderRadius: 8,
      opacity: data.isActive === false ? 0.3 : 1,
      transition: 'opacity 0.3s',
      outline: selected ? `2px solid ${colors.border}` : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Handle type="target" position={Position.Top} style={{ top: -8, left: '50%', transform: 'rotate(-45deg)' }} />
      <Handle type="source" position={Position.Left} id="true" style={{ left: -8, top: '50%', transform: 'rotate(-45deg)' }} />
      <Handle type="source" position={Position.Right} id="false" style={{ right: -8, top: '50%', transform: 'rotate(-45deg)' }} />
      <div style={{ transform: 'rotate(-45deg)', textAlign: 'center', padding: 8 }}>
        <div style={{ fontSize: 16 }}>{colors.icon}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: colors.text, fontFamily: 'monospace' }}>{data.label}</div>
        <div style={{ fontSize: 9, color: colors.text, opacity: 0.7, maxWidth: 80, wordBreak: 'break-word' }}>
          {data.detail?.substring(0, 30)}
        </div>
      </div>
    </div>
  )
})
