import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { NODE_COLORS, getDiffBorder } from './index'
import type { SQLNodeData } from '@/types'

export const OutputNode = memo(function OutputNode({ data, selected }: NodeProps<Node<SQLNodeData>>) {
  const colors = NODE_COLORS.output
  return (
    <div
      className={data.isActive === true ? 'node-active' : undefined}
      style={{
      background: colors.bg, border: `1.5px solid ${getDiffBorder(data, colors.border)}`, borderRadius: 8,
      padding: '12px 16px', minWidth: 220, maxWidth: 280,
      opacity: data.isActive === false ? 0.3 : 1, transition: 'opacity 0.3s',
      outline: selected ? `2px solid ${colors.border}` : 'none', outlineOffset: 2,
    }}>
      <Handle type="target" position={Position.Top} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 13 }}>{colors.icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: colors.text, fontFamily: 'monospace' }}>{data.label}</span>
      </div>
      <p style={{ fontSize: 11, color: colors.text, margin: 0, lineHeight: 1.4, opacity: 0.75 }}>{data.detail}</p>
    </div>
  )
})
