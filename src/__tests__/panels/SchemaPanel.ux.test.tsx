// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@/store/useAppStore', () => ({ useAppStore: vi.fn() }))

import { useAppStore } from '@/store/useAppStore'
import { SchemaPanel } from '@/components/panels/SchemaPanel'

const MOCK_SCHEMA = {
  users: {
    columns: [{ name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false, isIndexed: false, nullable: false }],
    indexes: [],
    primaryKeys: ['id'],
    foreignKeys: [],
  },
}

function mountLoaded() {
  const clearSchema = vi.fn()
  vi.mocked(useAppStore).mockImplementation((sel: (s: unknown) => unknown) =>
    sel({ schema: MOCK_SCHEMA, clearSchema, loadSchema: vi.fn() })
  )
  return { clearSchema, result: render(<SchemaPanel />) }
}

describe('SchemaPanel clear confirmation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('asks for confirmation before clearing schema', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { clearSchema } = mountLoaded()
    fireEvent.click(screen.getByRole('button', { name: /clear schema/i }))
    expect(window.confirm).toHaveBeenCalled()
    expect(clearSchema).not.toHaveBeenCalled()
  })

  it('clears schema when user confirms', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { clearSchema } = mountLoaded()
    fireEvent.click(screen.getByRole('button', { name: /clear schema/i }))
    expect(clearSchema).toHaveBeenCalled()
  })
})
