// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UnpivotNode } from '@/components/diagram/nodes/UnpivotNode'

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
  id: 'unpivot-1',
  type: 'unpivotNode',
  selected: false,
  dragging: false,
  zIndex: 0,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
  data: {
    nodeType: 'unpivot' as const,
    label: 'UNPIVOT sales',
    detail: 'Rotates columns into rows.',
    clause: 'UNPIVOT (amount FOR month IN (...))',
    isActive: undefined,
    diffStatus: undefined,
  },
  ...overrides,
})

describe('UnpivotNode', () => {
  it('renders the node label', () => {
    render(<UnpivotNode {...makeProps()} />)
    expect(screen.getByText('UNPIVOT sales')).toBeDefined()
  })

  it('renders the detail text', () => {
    render(<UnpivotNode {...makeProps()} />)
    expect(screen.getByText('Rotates columns into rows.')).toBeDefined()
  })

  it('applies node-selected class when selected', () => {
    const { container } = render(<UnpivotNode {...makeProps({ selected: true })} />)
    expect(container.querySelector('.node-selected')).not.toBeNull()
  })

  it('renders without detail section when detail is empty', () => {
    const props = makeProps()
    props.data = { ...props.data, detail: '' }
    const { container } = render(<UnpivotNode {...props} />)
    expect(container.querySelector('p')).toBeNull()
  })
})
