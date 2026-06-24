import { useState } from 'react'
import { getBezierPath, EdgeLabelRenderer, BaseEdge, type EdgeProps } from '@xyflow/react'

const PILL_STYLE: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid rgba(93,202,165,0.4)',
  borderRadius: 3,
  padding: '1px 5px',
  fontSize: 9,
  color: '#5DCAA5',
  fontFamily: 'monospace',
  cursor: 'default',
  whiteSpace: 'nowrap',
  display: 'inline-block',
}

const TOOLTIP_STYLE: React.CSSProperties = {
  position: 'absolute',
  bottom: '100%',
  left: '50%',
  transform: 'translateX(-50%)',
  marginBottom: 6,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '6px 8px',
  fontSize: 10,
  color: 'var(--text-1)',
  fontFamily: 'monospace',
  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
  zIndex: 100,
  maxWidth: 280,
  whiteSpace: 'normal',
  wordBreak: 'break-word',
}

function OnTooltip({ text }: { text: string }) {
  return <div style={TOOLTIP_STYLE}>{text}</div>
}

function OnPill({ onCondition }: { onCondition: string }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      style={{ pointerEvents: 'all', zIndex: 10, position: 'relative' }}
      className="nodrag nopan"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={PILL_STYLE}>ON ···</span>
      {hovered && onCondition && <OnTooltip text={onCondition} />}
    </div>
  )
}

export function LabeledJoinEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data, style, markerEnd,
}: EdgeProps) {
  const onCondition = (data as { onCondition?: string } | undefined)?.onCondition ?? ''

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div style={{
          position: 'absolute',
          display: 'inline-block',
          transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
        }}>
          <OnPill onCondition={onCondition} />
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
