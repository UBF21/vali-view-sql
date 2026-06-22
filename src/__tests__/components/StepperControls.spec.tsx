// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepperControls } from '@/components/diagram/StepperControls'
import type { StepAnimationState, StepSpeed } from '@/hooks/useStepAnimation'

// framer-motion: animate without real animations in jsdom
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, style, onClick, title }: React.HTMLAttributes<HTMLDivElement> & { title?: string }) => (
      <div style={style} onClick={onClick} title={title}>{children}</div>
    ),
    button: ({ children, style, onClick, title, 'aria-label': ariaLabel }: React.ButtonHTMLAttributes<HTMLButtonElement> & { title?: string }) => (
      <button style={style} onClick={onClick} title={title} aria-label={ariaLabel}>{children}</button>
    ),
  },
}))

const STEP = {
  id: 'step-1',
  nodeId: 'node-1',
  title: 'Step 1: Filter rows',
  description: 'Apply WHERE clause to filter rows.',
  edgeIds: [],
}

function makeState(overrides: Partial<StepAnimationState> = {}): StepAnimationState {
  return {
    currentIndex: 0,
    isPlaying: false,
    isComplete: false,
    totalSteps: 3,
    currentStep: STEP,
    speed: 1500 as StepSpeed,
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

beforeEach(() => { vi.clearAllMocks() })

describe('StepperControls — empty state', () => {
  it('shows placeholder when totalSteps is 0', () => {
    render(<StepperControls state={makeState({ totalSteps: 0, currentStep: null })} />)
    expect(screen.getByText(/parse a sql query/i)).toBeDefined()
  })
})

describe('StepperControls — step description', () => {
  it('renders step index and cleaned title', () => {
    render(<StepperControls state={makeState()} />)
    expect(screen.getByText(/Step 1 \/ 3:/)).toBeDefined()
    expect(screen.getByText('Filter rows')).toBeDefined()
  })

  it('renders step description text', () => {
    render(<StepperControls state={makeState()} />)
    expect(screen.getByText(/Apply WHERE clause/)).toBeDefined()
  })

  it('shows ✓ Complete badge when isComplete is true', () => {
    render(<StepperControls state={makeState({ isComplete: true })} />)
    expect(screen.getByText(/✓ Complete/)).toBeDefined()
  })

  it('does NOT show complete badge when isComplete is false', () => {
    render(<StepperControls state={makeState({ isComplete: false })} />)
    expect(screen.queryByText(/✓ Complete/)).toBeNull()
  })
})

describe('StepperControls — navigation buttons', () => {
  it('calls goReset when First step button is clicked', () => {
    const state = makeState({ currentIndex: 1 })
    render(<StepperControls state={state} />)
    fireEvent.click(screen.getByRole('button', { name: /first step/i }))
    expect(state.goReset).toHaveBeenCalledTimes(1)
  })

  it('calls goPrev when Previous step button is clicked', () => {
    const state = makeState({ currentIndex: 1 })
    render(<StepperControls state={state} />)
    fireEvent.click(screen.getByRole('button', { name: /previous step/i }))
    expect(state.goPrev).toHaveBeenCalledTimes(1)
  })

  it('calls goNext when Next step button is clicked', () => {
    const state = makeState({ currentIndex: 0 })
    render(<StepperControls state={state} />)
    fireEvent.click(screen.getByRole('button', { name: /next step/i }))
    expect(state.goNext).toHaveBeenCalledTimes(1)
  })

  it('calls goToEnd when Last step button is clicked', () => {
    const state = makeState({ currentIndex: 0 })
    render(<StepperControls state={state} />)
    fireEvent.click(screen.getByRole('button', { name: /last step/i }))
    expect(state.goToEnd).toHaveBeenCalledTimes(1)
  })

  it('disables First and Previous when at index 0', () => {
    render(<StepperControls state={makeState({ currentIndex: 0 })} />)
    expect((screen.getByRole('button', { name: /first step/i }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: /previous step/i }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('disables Next and Last when at last index', () => {
    render(<StepperControls state={makeState({ currentIndex: 2, totalSteps: 3 })} />)
    expect((screen.getByRole('button', { name: /next step/i }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: /last step/i }) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('StepperControls — play/pause', () => {
  it('calls togglePlay when Play button is clicked', () => {
    const state = makeState({ isPlaying: false })
    render(<StepperControls state={state} />)
    fireEvent.click(screen.getByRole('button', { name: /play/i }))
    expect(state.togglePlay).toHaveBeenCalledTimes(1)
  })

  it('shows Pause label when isPlaying is true', () => {
    render(<StepperControls state={makeState({ isPlaying: true })} />)
    expect(screen.getByRole('button', { name: /pause/i })).toBeDefined()
  })
})

describe('StepperControls — speed control', () => {
  it('renders Slow / Normal / Fast buttons', () => {
    render(<StepperControls state={makeState()} />)
    expect(screen.getByText('Slow')).toBeDefined()
    expect(screen.getByText('Normal')).toBeDefined()
    expect(screen.getByText('Fast')).toBeDefined()
  })

  it('calls setSpeed with 2000 when Slow is clicked', () => {
    const state = makeState()
    render(<StepperControls state={state} />)
    fireEvent.click(screen.getByText('Slow'))
    expect(state.setSpeed).toHaveBeenCalledWith(2000)
  })

  it('calls setSpeed with 500 when Fast is clicked', () => {
    const state = makeState()
    render(<StepperControls state={state} />)
    fireEvent.click(screen.getByText('Fast'))
    expect(state.setSpeed).toHaveBeenCalledWith(500)
  })
})

describe('StepperControls — progress dots', () => {
  it('renders dots equal to totalSteps (up to 12)', () => {
    render(<StepperControls state={makeState({ totalSteps: 5 })} />)
    const dots = screen.getAllByTitle(/^Step \d+$/)
    expect(dots).toHaveLength(5)
  })

  it('calls goToIndex when a dot is clicked', () => {
    const state = makeState({ totalSteps: 3 })
    render(<StepperControls state={state} />)
    fireEvent.click(screen.getByTitle('Step 2'))
    expect(state.goToIndex).toHaveBeenCalledWith(1)
  })

  it('shows +N overflow label when totalSteps > 12', () => {
    render(<StepperControls state={makeState({ totalSteps: 15 })} />)
    expect(screen.getByText('+3')).toBeDefined()
  })
})

describe('StepperControls — keyboard hint', () => {
  it('renders keyboard shortcut hint text', () => {
    render(<StepperControls state={makeState()} />)
    expect(screen.getByText(/navigate.*play\/pause/i)).toBeDefined()
  })
})
