// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ZoomButtons } from '@/components/diagram/ZoomButtons'

const mockZoomIn  = vi.fn()
const mockZoomOut = vi.fn()
const mockFitView = vi.fn()

let zoomControls: { zoomIn: () => void; zoomOut: () => void; fitView: (o?: { padding?: number }) => void } | null = null

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (sel: (s: object) => unknown) =>
    sel({ zoomControls }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ZoomButtons', () => {
  it('renders nothing when zoomControls is null', () => {
    zoomControls = null
    const { container } = render(<ZoomButtons />)
    expect(container.firstChild).toBeNull()
  })

  it('renders zoom buttons when controls are available', () => {
    zoomControls = { zoomIn: mockZoomIn, zoomOut: mockZoomOut, fitView: mockFitView }
    render(<ZoomButtons />)
    expect(screen.getByRole('button', { name: /zoom in/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /zoom out/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /fit to view/i })).toBeTruthy()
  })

  it('calls zoomIn on + click', () => {
    zoomControls = { zoomIn: mockZoomIn, zoomOut: mockZoomOut, fitView: mockFitView }
    render(<ZoomButtons />)
    fireEvent.click(screen.getByRole('button', { name: /zoom in/i }))
    expect(mockZoomIn).toHaveBeenCalledOnce()
  })

  it('calls zoomOut on − click', () => {
    zoomControls = { zoomIn: mockZoomIn, zoomOut: mockZoomOut, fitView: mockFitView }
    render(<ZoomButtons />)
    fireEvent.click(screen.getByRole('button', { name: /zoom out/i }))
    expect(mockZoomOut).toHaveBeenCalledOnce()
  })

  it('calls fitView with padding on fit click', () => {
    zoomControls = { zoomIn: mockZoomIn, zoomOut: mockZoomOut, fitView: mockFitView }
    render(<ZoomButtons />)
    fireEvent.click(screen.getByRole('button', { name: /fit to view/i }))
    expect(mockFitView).toHaveBeenCalledWith({ padding: 0.2 })
  })
})
