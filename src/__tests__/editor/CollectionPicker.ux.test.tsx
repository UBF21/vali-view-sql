// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@/store/useAppStore', () => ({ useAppStore: vi.fn() }))
vi.mock('react-dom', async () => {
  const mod = await vi.importActual<typeof import('react-dom')>('react-dom')
  return { ...mod, createPortal: (node: React.ReactNode) => node }
})

import { useAppStore } from '@/store/useAppStore'
import { CollectionPicker } from '@/components/editor/CollectionPicker'

const mockRemove = vi.fn()
const COLLECTIONS = [
  { id: 'col1', name: 'Work', queries: [{ id: 'q1', name: 'Q1', sql: 'SELECT 1', dialect: 'postgresql', tags: [] }] },
]

function mountPicker() {
  vi.mocked(useAppStore).mockImplementation((sel: (s: unknown) => unknown) =>
    sel({
      collections: COLLECTIONS,
      setQuery: vi.fn(), setDialect: vi.fn(),
      removeCollection: mockRemove,
    })
  )
  return render(<CollectionPicker />)
}

describe('CollectionPicker delete confirmation', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(window, 'confirm').mockReturnValue(false) })

  it('asks for confirmation before deleting collection', () => {
    mountPicker()
    fireEvent.click(screen.getByRole('button', { name: /query collections/i }))
    const deleteBtn = screen.getByRole('button', { name: /delete collection Work/i })
    fireEvent.click(deleteBtn)
    expect(window.confirm).toHaveBeenCalledWith('Delete collection "Work" and all its queries?')
    expect(mockRemove).not.toHaveBeenCalled()
  })

  it('deletes collection when user confirms', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mountPicker()
    fireEvent.click(screen.getByRole('button', { name: /query collections/i }))
    const deleteBtn = screen.getByRole('button', { name: /delete collection Work/i })
    fireEvent.click(deleteBtn)
    expect(mockRemove).toHaveBeenCalledWith('col1')
  })
})
