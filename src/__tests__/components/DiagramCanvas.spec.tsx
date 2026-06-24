// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { DiagramCanvas } from '@/components/diagram/DiagramCanvas'

vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: { children: React.ReactNode }) => <div data-testid="reactflow">{children}</div>,
  useNodesState: (n: unknown[]) => [n, vi.fn(), vi.fn()] as const,
  useEdgesState: (e: unknown[]) => [e, vi.fn(), vi.fn()] as const,
  useReactFlow: () => ({ zoomIn: vi.fn(), zoomOut: vi.fn(), fitView: vi.fn() }),
}))

vi.mock('@/hooks/useSQLParseAnim', () => ({
  useSQLParseAnim: () => ({ isAnimating: false }),
}))

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (sel: (s: { setInfoNode: () => void; complexityResult: null; setZoomControls: () => void }) => unknown) =>
    sel({ setInfoNode: vi.fn(), complexityResult: null, setZoomControls: vi.fn() }),
}))

vi.mock('@/components/diagram/NodeInfoPanel', () => ({ NodeInfoPanel: () => null }))
vi.mock('@/components/diagram/nodes', () => ({ customNodeTypes: {} }))

describe('DiagramCanvas', () => {
  it('renderiza el canvas de ReactFlow', () => {
    const { getByTestId } = render(<DiagramCanvas nodes={[]} edges={[]} />)
    expect(getByTestId('reactflow')).toBeTruthy()
  })

  it('acepta className', () => {
    const { container } = render(<DiagramCanvas nodes={[]} edges={[]} className="test-class" />)
    expect(container.querySelector('.test-class')).toBeTruthy()
  })
})
