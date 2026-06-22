// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MobileSwipeLayout } from '@/components/mobile/MobileSwipeLayout'
import type { SwipeView } from '@/components/mobile/MobileSwipeLayout'

afterEach(cleanup)

const views: SwipeView[] = [
  { key: 'a', label: 'Vista A', content: <span>Contenido A</span> },
  { key: 'b', label: 'Vista B', content: <span>Contenido B</span> },
  { key: 'c', label: 'Vista C', content: <span>Contenido C</span> },
]

describe('MobileSwipeLayout', () => {
  it('renderiza el tab bar con todos los labels', () => {
    render(<MobileSwipeLayout views={views} />)
    expect(screen.getByText('Vista A')).toBeDefined()
    expect(screen.getByText('Vista B')).toBeDefined()
    expect(screen.getByText('Vista C')).toBeDefined()
  })

  it('muestra el contenido del defaultIndex=0 al inicio', () => {
    render(<MobileSwipeLayout views={views} />)
    expect(screen.getByText('Contenido A')).toBeDefined()
    expect(screen.queryByText('Contenido B')).toBeNull()
  })

  it('muestra el contenido del defaultIndex especificado', () => {
    render(<MobileSwipeLayout views={views} defaultIndex={1} />)
    expect(screen.getByText('Contenido B')).toBeDefined()
    expect(screen.queryByText('Contenido A')).toBeNull()
  })

  it('cambia de vista al hacer click en un tab', () => {
    render(<MobileSwipeLayout views={views} />)
    fireEvent.click(screen.getByText('Vista B'))
    expect(screen.getByText('Contenido B')).toBeDefined()
    expect(screen.queryByText('Contenido A')).toBeNull()
  })

  it('avanza vista con swipe horizontal izquierda (dx > 50)', () => {
    render(<MobileSwipeLayout views={views} />)
    const container = screen.getByText('Contenido A').parentElement!

    fireEvent.touchStart(container, { touches: [{ clientX: 200, clientY: 100 }] })
    fireEvent.touchEnd(container, { changedTouches: [{ clientX: 100, clientY: 100 }] })

    expect(screen.getByText('Contenido B')).toBeDefined()
  })

  it('retrocede vista con swipe horizontal derecha (dx < -50)', () => {
    render(<MobileSwipeLayout views={views} defaultIndex={1} />)
    const container = screen.getByText('Contenido B').parentElement!

    fireEvent.touchStart(container, { touches: [{ clientX: 100, clientY: 100 }] })
    fireEvent.touchEnd(container, { changedTouches: [{ clientX: 200, clientY: 100 }] })

    expect(screen.getByText('Contenido A')).toBeDefined()
  })

  it('ignora swipe con desplazamiento menor a 50px', () => {
    render(<MobileSwipeLayout views={views} />)
    const container = screen.getByText('Contenido A').parentElement!

    fireEvent.touchStart(container, { touches: [{ clientX: 200, clientY: 100 }] })
    fireEvent.touchEnd(container, { changedTouches: [{ clientX: 160, clientY: 100 }] })

    expect(screen.getByText('Contenido A')).toBeDefined()
  })

  it('ignora swipe predominantemente vertical', () => {
    render(<MobileSwipeLayout views={views} />)
    const container = screen.getByText('Contenido A').parentElement!

    fireEvent.touchStart(container, { touches: [{ clientX: 200, clientY: 100 }] })
    fireEvent.touchEnd(container, { changedTouches: [{ clientX: 100, clientY: 250 }] })

    expect(screen.getByText('Contenido A')).toBeDefined()
  })

  it('no avanza más allá del último tab', () => {
    render(<MobileSwipeLayout views={views} defaultIndex={2} />)
    const container = screen.getByText('Contenido C').parentElement!

    fireEvent.touchStart(container, { touches: [{ clientX: 200, clientY: 100 }] })
    fireEvent.touchEnd(container, { changedTouches: [{ clientX: 100, clientY: 100 }] })

    expect(screen.getByText('Contenido C')).toBeDefined()
  })

  it('no retrocede más allá del primer tab', () => {
    render(<MobileSwipeLayout views={views} defaultIndex={0} />)
    const container = screen.getByText('Contenido A').parentElement!

    fireEvent.touchStart(container, { touches: [{ clientX: 100, clientY: 100 }] })
    fireEvent.touchEnd(container, { changedTouches: [{ clientX: 200, clientY: 100 }] })

    expect(screen.getByText('Contenido A')).toBeDefined()
  })

  it('aplica color personalizado en el tab activo', () => {
    const viewsConColor: SwipeView[] = [
      { key: 'x', label: 'Tab X', color: '#ff0000', content: <span>X</span> },
    ]
    const { container } = render(<MobileSwipeLayout views={viewsConColor} />)
    const btn = container.querySelector('button') as HTMLButtonElement
    expect(btn.style.color).toBe('rgb(255, 0, 0)')
  })
})
