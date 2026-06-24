// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LabeledJoinEdge } from '@/components/diagram/edges/LabeledJoinEdge'
import { Position } from '@xyflow/react'

vi.mock('@xyflow/react', () => ({
  getBezierPath: () => ['M0,0', 50, 50],
  BaseEdge: ({ id }: { id: string }) => <svg><path data-testid={`base-edge-${id}`} /></svg>,
  EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
}))

const BASE_PROPS = {
  id: 'e1', source: 'a', target: 'b',
  sourceX: 0, sourceY: 0, targetX: 100, targetY: 100,
  sourcePosition: Position.Bottom, targetPosition: Position.Top,
  selected: false, animated: false, data: {},
  style: {}, markerEnd: undefined, markerStart: undefined,
  label: undefined, labelStyle: undefined, labelShowBg: false,
  labelBgStyle: undefined, labelBgPadding: [0, 0] as [number, number],
  labelBgBorderRadius: 0, interactionWidth: 20,
}

describe('LabeledJoinEdge', () => {
  it('renders the ON pill', () => {
    render(<LabeledJoinEdge {...BASE_PROPS} data={{ onCondition: 'a.id = b.a_id' }} />)
    expect(screen.getByText('ON ···')).toBeTruthy()
  })

  it('shows tooltip on hover', () => {
    render(<LabeledJoinEdge {...BASE_PROPS} data={{ onCondition: 'a.id = b.a_id' }} />)
    fireEvent.mouseEnter(screen.getByText('ON ···').parentElement!)
    expect(screen.getByText('a.id = b.a_id')).toBeTruthy()
  })

  it('hides tooltip when not hovered', () => {
    render(<LabeledJoinEdge {...BASE_PROPS} data={{ onCondition: 'a.id = b.a_id' }} />)
    expect(screen.queryByText('a.id = b.a_id')).toBeNull()
  })

  it('renders pill even with empty onCondition', () => {
    render(<LabeledJoinEdge {...BASE_PROPS} data={{}} />)
    expect(screen.getByText('ON ···')).toBeTruthy()
  })
})
