// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BaseNodeCard } from '@/components/diagram/nodes/BaseNode'

const mockSetInfoNode = vi.fn()

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (sel: (s: { setInfoNode: typeof mockSetInfoNode }) => unknown) =>
    sel({ setInfoNode: mockSetInfoNode }),
}))

const BASE_PROPS = {
  nodeType: 'table' as const,
  label: 'users',
  detail: 'Loads base data from the users table.',
  clause: 'FROM users',
  accentColor: '#C8880A',
  textColor: '#C8880A',
  bgColor: '#1A1000',
  borderColor: '#C8880A',
}

beforeEach(() => { mockSetInfoNode.mockClear() })

describe('BaseNodeCard', () => {
  it('renders label and detail', () => {
    render(<BaseNodeCard {...BASE_PROPS} />)
    expect(screen.getByText('users')).toBeDefined()
    expect(screen.getByText(BASE_PROPS.detail)).toBeDefined()
  })

  it('calls setInfoNode when info button is clicked', () => {
    render(<BaseNodeCard {...BASE_PROPS} />)
    fireEvent.click(screen.getByRole('button', { name: /show node info/i }))
    expect(mockSetInfoNode).toHaveBeenCalledWith({
      nodeType: 'table',
      label: 'users',
      detail: BASE_PROPS.detail,
      clause: 'FROM users',
    })
  })

  it('does NOT call setInfoNode when card body is clicked', () => {
    const { container } = render(<BaseNodeCard {...BASE_PROPS} />)
    fireEvent.click(container.firstChild as Element)
    expect(mockSetInfoNode).not.toHaveBeenCalled()
  })

  it('calls setInfoNode when info button is clicked', () => {
    render(<BaseNodeCard {...BASE_PROPS} />)
    fireEvent.click(screen.getByRole('button', { name: /show node info/i }))
    expect(mockSetInfoNode).toHaveBeenCalledTimes(1)
  })

  it('does not render detail section when detail is omitted', () => {
    const { container } = render(<BaseNodeCard {...BASE_PROPS} detail={undefined} />)
    expect(container.querySelector('p')).toBeNull()
  })

  it('applies node-selected class when selected', () => {
    const { container } = render(<BaseNodeCard {...BASE_PROPS} selected />)
    expect((container.firstChild as Element).className).toContain('node-selected')
  })

  it('applies node-active class when isActive is true', () => {
    const { container } = render(<BaseNodeCard {...BASE_PROPS} isActive />)
    expect((container.firstChild as Element).className).toContain('node-active')
  })

  it('reduces opacity when isActive is false', () => {
    const { container } = render(<BaseNodeCard {...BASE_PROPS} isActive={false} />)
    const style = (container.firstChild as HTMLElement).style
    expect(style.opacity).toBe('0.3')
  })

  it('shows diff badge when diffStatus is added', () => {
    render(<BaseNodeCard {...BASE_PROPS} diffStatus="added" />)
    expect(screen.getByText('+ added')).toBeDefined()
  })

  it('shows no diff badge when diffStatus is same', () => {
    render(<BaseNodeCard {...BASE_PROPS} diffStatus="same" />)
    expect(screen.queryByText('+added')).toBeNull()
  })
})
