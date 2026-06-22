// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MobileExplainLayout } from '@/components/mobile/MobileExplainLayout'

// ── Mocks de dependencias pesadas ─────────────────────────────────────────────

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (sel: (s: { query: string; setQuery: (v: string) => void }) => unknown) =>
    sel({ query: 'SELECT 1', setQuery: vi.fn() }),
}))

vi.mock('@/components/editor/QueryEditor', () => ({
  QueryEditor: ({ value }: { value: string }) => <textarea data-testid="query-editor" defaultValue={value} />,
}))

vi.mock('@/components/diagram/DiagramCanvas', () => ({
  DiagramCanvas: () => <div data-testid="diagram-canvas" />,
}))

vi.mock('@/components/layout/PanelRight', () => ({
  PanelRight: () => <div data-testid="panel-right" />,
}))

vi.mock('@/components/diagram/ExportButton', () => ({
  ExportButton: () => <button data-testid="export-button">Export</button>,
}))

vi.mock('@/components/editor/HistoryPicker', () => ({
  HistoryPicker: () => <button data-testid="history-picker">History</button>,
}))

vi.mock('@/components/editor/ExamplePicker', () => ({
  ExamplePicker: () => <button data-testid="example-picker">Examples</button>,
}))

// ── Fixture ───────────────────────────────────────────────────────────────────

const defaultProps = {
  nodes: [],
  edges: [],
  isLoading: false,
}

afterEach(cleanup)

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MobileExplainLayout', () => {
  it('renderiza los 3 tabs: Editor, Diagram y Analysis', () => {
    render(<MobileExplainLayout {...defaultProps} />)
    expect(screen.getByText('Editor')).toBeDefined()
    expect(screen.getByText('Diagram')).toBeDefined()
    expect(screen.getByText('Analysis')).toBeDefined()
  })

  it('muestra el DiagramCanvas por defecto (defaultIndex=1)', () => {
    render(<MobileExplainLayout {...defaultProps} />)
    expect(screen.getByTestId('diagram-canvas')).toBeDefined()
    expect(screen.queryByTestId('query-editor')).toBeNull()
    expect(screen.queryByTestId('panel-right')).toBeNull()
  })

  it('cambia a la vista Editor al hacer click en su tab', () => {
    render(<MobileExplainLayout {...defaultProps} />)
    fireEvent.click(screen.getByText('Editor'))
    expect(screen.getByTestId('query-editor')).toBeDefined()
    expect(screen.getByTestId('history-picker')).toBeDefined()
    expect(screen.getByTestId('example-picker')).toBeDefined()
    expect(screen.queryByTestId('diagram-canvas')).toBeNull()
  })

  it('cambia a la vista Analysis al hacer click en su tab', () => {
    render(<MobileExplainLayout {...defaultProps} />)
    fireEvent.click(screen.getByText('Analysis'))
    expect(screen.getByTestId('panel-right')).toBeDefined()
    expect(screen.queryByTestId('diagram-canvas')).toBeNull()
  })

  it('muestra el ExportButton en la vista Diagram', () => {
    render(<MobileExplainLayout {...defaultProps} />)
    expect(screen.getByTestId('export-button')).toBeDefined()
  })

  it('renderiza sin crash con isLoading=true', () => {
    render(<MobileExplainLayout {...defaultProps} isLoading />)
    expect(screen.getByTestId('diagram-canvas')).toBeDefined()
  })
})
