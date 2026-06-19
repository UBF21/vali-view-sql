import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { NODE_COLORS, getDiffBorder } from './index'
import type { SQLNodeData } from '@/types'

const DIRECTION_ICON: Record<string, string> = { IN: '→', OUT: '←', INOUT: '↔' }

export const ParamNode = memo(function ParamNode({ data, selected }: NodeProps<Node<SQLNodeData>>) {
  const colors = NODE_COLORS.param
  const dirIcon = DIRECTION_ICON[data.paramDirection ?? 'IN'] ?? '→'
  return (
    <div style={{
      background: colors.bg,
      border: `1.5px solid ${getDiffBorder(data, colors.border)}`,
      borderRadius: 8,
      padding: '8px 12px',
      minWidth: 160, maxWidth: 220,
      opacity: data.isActive === false ? 0.3 : 1,
      transition: 'opacity 0.3s',
      outline: selected ? `2px solid ${colors.border}` : 'none', outlineOffset: 2,
    }}>
      <Handle type="source" position={Position.Bottom} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11 }}>{dirIcon}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: colors.text, fontFamily: 'monospace' }}>{data.label}</span>
      </div>
      <p style={{ fontSize: 10, color: colors.text, margin: '2px 0 0', opacity: 0.7 }}>{data.detail}</p>
    </div>
  )
})
