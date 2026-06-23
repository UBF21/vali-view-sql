// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PivotNode } from '@/components/diagram/nodes/PivotNode'

const mockSetInfoNode = vi.fn()

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (sel: (s: { setInfoNode: typeof mockSetInfoNode }) => unknown) =>
    sel({ setInfoNode: mockSetInfoNode }),
}))

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual<typeof import('@xyflow/react')>('@xyflow/react')
  return {
    ...actual,
    Handle: () => null,
    Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
  }
})

const makeProps = (overrides = {}) => ({
  id: 'pivot-1',
  type: 'pivotNode',
  selected: false,
  dragging: false,
  zIndex: 0,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
  data: {
    nodeType: 'pivot' as const,
    label: 'PIVOT sales',
    detail: 'Rotates rows into columns.',
    clause: 'PIVOT (SUM(amount) FOR month IN (...))',
    isActive: undefined,
    diffStatus: undefined,
  },
  ...overrides,
})

describe('PivotNode', () => {
  it('renders the node label', () => {
    render(<PivotNode {...makeProps()} />)
    expect(screen.getByText('PIVOT sales')).toBeDefined()
  })

  it('renders the detail text', () => {
    render(<PivotNode {...makeProps()} />)
    expect(screen.getByText('Rotates rows into columns.')).toBeDefined()
  })

  it('applies node-selected class when selected', () => {
    const { container } = render(<PivotNode {...makeProps({ selected: true })} />)
    expect(container.querySelector('.node-selected')).not.toBeNull()
  })

  it('renders without detail section when detail is empty', () => {
    const props = makeProps()
    props.data = { ...props.data, detail: '' }
    const { container } = render(<PivotNode {...props} />)
    expect(container.querySelector('p')).toBeNull()
  })
})
