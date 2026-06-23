// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MergeNode } from '@/components/diagram/nodes/MergeNode'

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
  id: 'merge-1',
  type: 'mergeNode',
  selected: false,
  dragging: false,
  zIndex: 0,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
  data: {
    nodeType: 'merge' as const,
    label: 'MERGE target',
    detail: 'Merges source into target table.',
    clause: 'MERGE target USING source',
    isActive: undefined,
    diffStatus: undefined,
  },
  ...overrides,
})

describe('MergeNode', () => {
  it('renders the node label', () => {
    render(<MergeNode {...makeProps()} />)
    expect(screen.getByText('MERGE target')).toBeDefined()
  })

  it('renders the detail text', () => {
    render(<MergeNode {...makeProps()} />)
    expect(screen.getByText('Merges source into target table.')).toBeDefined()
  })

  it('applies node-selected class when selected', () => {
    const { container } = render(<MergeNode {...makeProps({ selected: true })} />)
    const card = container.querySelector('.node-selected')
    expect(card).not.toBeNull()
  })

  it('renders without detail when detail is empty', () => {
    const props = makeProps()
    props.data = { ...props.data, detail: '' }
    const { container } = render(<MergeNode {...props} />)
    expect(container.querySelector('p')).toBeNull()
  })
})
