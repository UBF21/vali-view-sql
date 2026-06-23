// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MobileStepperLayout } from '@/components/mobile/MobileStepperLayout'
import type { StepAnimationState } from '@/hooks/useStepAnimation'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (sel: (s: { query: string; setQuery: (v: string) => void }) => unknown) =>
    sel({ query: 'SELECT 1', setQuery: vi.fn() }),
}))

vi.mock('@/components/diagram/DiagramCanvas', () => ({
  DiagramCanvas: () => <div data-testid="diagram-canvas" />,
}))

vi.mock('@/components/diagram/StepperControls', () => ({
  StepperControls: ({ state }: { state: StepAnimationState }) => (
    <div data-testid="stepper-controls" data-total={state.totalSteps} />
  ),
}))

vi.mock('@/components/editor/QueryEditor', () => ({
  QueryEditor: ({ value }: { value: string }) => (
    <textarea data-testid="query-editor" defaultValue={value} readOnly />
  ),
}))

vi.mock('@/components/editor/CollectionPicker', () => ({
  CollectionPicker: () => <button data-testid="collection-picker">Collections</button>,
}))

vi.mock('@/components/editor/ExamplePicker', () => ({
  ExamplePicker: () => <button data-testid="example-picker">Examples</button>,
}))

vi.mock('framer-motion', () => ({
  motion: new Proxy({} as Record<string, unknown>, {
    get: (_t, tag: string) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ({ children, onClick, style }: any) => {
        const Tag = tag as keyof JSX.IntrinsicElements
        return <Tag onClick={onClick} style={style}>{children}</Tag>
      },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// ── Fixture ───────────────────────────────────────────────────────────────────

function makeStepAnimation(overrides: Partial<StepAnimationState> = {}): StepAnimationState {
  return {
    currentIndex: 0,
    isPlaying: false,
    isComplete: false,
    totalSteps: 3,
    currentStep: null,
    speed: 1500,
    goNext: vi.fn(),
    goPrev: vi.fn(),
    goReset: vi.fn(),
    goToEnd: vi.fn(),
    togglePlay: vi.fn(),
    goToIndex: vi.fn(),
    setSpeed: vi.fn(),
    ...overrides,
  }
}

const defaultProps = {
  nodes: [],
  edges: [],
  isLoading: false,
  stepAnimation: makeStepAnimation(),
}

afterEach(cleanup)

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MobileStepperLayout', () => {
  it('renderiza DiagramCanvas y StepperControls', () => {
    render(<MobileStepperLayout {...defaultProps} />)
    expect(screen.getByTestId('diagram-canvas')).toBeDefined()
    expect(screen.getByTestId('stepper-controls')).toBeDefined()
  })

  it('no muestra el editor SQL al inicio', () => {
    render(<MobileStepperLayout {...defaultProps} />)
    expect(screen.queryByTestId('query-editor')).toBeNull()
  })

  it('muestra el FAB SQL con label accesible', () => {
    render(<MobileStepperLayout {...defaultProps} />)
    expect(screen.getByLabelText('Open SQL editor')).toBeDefined()
  })

  it('abre el bottom sheet con editor al hacer click en el FAB', () => {
    render(<MobileStepperLayout {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('Open SQL editor'))
    expect(screen.getByTestId('query-editor')).toBeDefined()
    expect(screen.getByTestId('collection-picker')).toBeDefined()
    expect(screen.getByTestId('example-picker')).toBeDefined()
  })

  it('cierra el bottom sheet al presionar Escape', () => {
    render(<MobileStepperLayout {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('Open SQL editor'))
    expect(screen.getByTestId('query-editor')).toBeDefined()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByTestId('query-editor')).toBeNull()
  })

  it('pasa totalSteps al StepperControls', () => {
    render(<MobileStepperLayout {...defaultProps} stepAnimation={makeStepAnimation({ totalSteps: 7 })} />)
    expect(screen.getByTestId('stepper-controls').getAttribute('data-total')).toBe('7')
  })

  it('renderiza sin crash con isLoading=true', () => {
    render(<MobileStepperLayout {...defaultProps} isLoading />)
    expect(screen.getByTestId('diagram-canvas')).toBeDefined()
  })
})
