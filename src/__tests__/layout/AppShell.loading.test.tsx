// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

// ── Stub heavy sub-components ─────────────────────────────────────────────────
vi.mock('@/components/diagram/DiagramCanvas', () => ({
  DiagramCanvas: () => <div data-testid="diagram-canvas" />,
}))

vi.mock('@/components/editor/QueryEditor', () => ({
  QueryEditor: () => <textarea data-testid="query-editor" />,
}))

vi.mock('@/components/editor/ExamplePicker', () => ({
  ExamplePicker: () => <div />,
}))

vi.mock('@/components/editor/CollectionPicker', () => ({
  CollectionPicker: () => <div />,
}))

vi.mock('@/components/layout/Header', () => ({
  Header: () => <div data-testid="header" />,
}))

vi.mock('@/components/layout/PanelRight', () => ({
  PanelRight: () => <div />,
}))

vi.mock('@/components/layout/DiffContent', () => ({
  DiffContent: () => <div />,
}))

vi.mock('@/components/diagram/StepperControls', () => ({
  StepperControls: () => <div />,
}))

vi.mock('@/components/diagram/ExportButton', () => ({
  ExportButton: () => <div />,
}))

vi.mock('@/components/mobile/MobileExplainLayout', () => ({
  MobileExplainLayout: () => <div />,
}))

vi.mock('@/components/mobile/MobileDiffLayout', () => ({
  MobileDiffLayout: () => <div />,
}))

vi.mock('@/components/mobile/MobileStepperLayout', () => ({
  MobileStepperLayout: () => <div />,
}))

vi.mock('@/hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}))

vi.mock('@/hooks/useStepAnimation', () => ({
  useStepAnimation: () => ({
    currentIndex: 0, isPlaying: false,
    goNext: vi.fn(), goPrev: vi.fn(), togglePlay: vi.fn(), goReset: vi.fn(), goToEnd: vi.fn(),
  }),
}))

vi.mock('@/lib/stepper/execution-steps', () => ({
  buildSteps: () => [],
  decorateNodesForStep: () => [],
  decorateEdgesForStep: () => [],
}))

vi.mock('@/store/useAppStore', () => ({
  useAppStore: vi.fn(),
}))

// ── Import after mocks ────────────────────────────────────────────────────────
import { useAppStore } from '@/store/useAppStore'
import { AppShell } from '@/components/layout/AppShell'

const BASE_STORE = {
  query: '', setQuery: vi.fn(), dialect: 'postgresql', setDialect: vi.fn(),
  parseResult: null, isLoading: false, mode: 'explain', issues: [], infoNode: null,
  suggestions: [], schema: null, collections: [], removeCollection: vi.fn(),
  theme: 'dark', setTheme: vi.fn(), setMode: vi.fn(),
}

function renderShell(overrides: Record<string, unknown> = {}) {
  const store = { ...BASE_STORE, ...overrides }
  vi.mocked(useAppStore).mockImplementation((sel: (s: typeof store) => unknown) => sel(store))
  return render(<AppShell />)
}

describe('AppShell canvas center', () => {
  beforeEach(() => { vi.clearAllMocks() })
  afterEach(cleanup)

  it('shows spinner when isLoading and no nodes', () => {
    renderShell({ isLoading: true, parseResult: null })
    expect(document.querySelector('.spin')).toBeTruthy()
    expect(screen.queryByText('Type a SQL query to visualize it')).toBeNull()
  })

  it('shows empty state when not loading and no nodes', () => {
    renderShell({ isLoading: false, parseResult: null })
    expect(screen.getByText('Type a SQL query to visualize it')).toBeTruthy()
    expect(document.querySelector('.spin')).toBeNull()
  })

  it('shows neither spinner nor empty state when nodes exist', () => {
    renderShell({
      isLoading: false,
      parseResult: { nodes: [{ id: 'n1', type: 'table', position: { x: 0, y: 0 }, data: {} }], edges: [], glossary: [], steps: [] },
    })
    expect(document.querySelector('.spin')).toBeNull()
    expect(screen.queryByText('Type a SQL query to visualize it')).toBeNull()
  })
})
