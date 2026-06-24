// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const addCollectionMock = vi.fn()
const mockCollections = [{ id: 'col_default', name: 'Default', queries: [] }]

vi.mock('@/store/useAppStore', () => {
  const useAppStore = vi.fn()
  ;(useAppStore as unknown as { getState: () => unknown }).getState = () => ({
    collections: mockCollections,
  })
  return { useAppStore }
})

import { useAppStore } from '@/store/useAppStore'
import { SaveQueryForm } from '@/components/editor/SaveQueryForm'

function mountForm() {
  vi.mocked(useAppStore).mockImplementation((sel: (s: unknown) => unknown) =>
    sel({
      collections: mockCollections,
      saveQueryToCollection: vi.fn(),
      addCollection: addCollectionMock,
    })
  )
  return render(<SaveQueryForm onClose={vi.fn()} />)
}

describe('SaveQueryForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows tag placeholder as "tag1, tag2, tag3"', () => {
    mountForm()
    expect(screen.getByPlaceholderText('tag1, tag2, tag3')).toBeTruthy()
  })
})
