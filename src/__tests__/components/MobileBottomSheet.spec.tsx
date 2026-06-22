// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MobileBottomSheet } from '@/components/mobile/MobileBottomSheet'

// framer-motion: render children sin animaciones en jsdom
vi.mock('framer-motion', () => {
  const Actual = vi.importActual<typeof import('framer-motion')>('framer-motion')
  return {
    ...Actual,
    motion: new Proxy({} as Record<string, unknown>, {
      get: (_t, tag: string) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ children, onClick, style }: any) => {
          const Tag = tag as keyof JSX.IntrinsicElements
          return <Tag onClick={onClick} style={style}>{children}</Tag>
        },
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

afterEach(cleanup)

describe('MobileBottomSheet', () => {
  it('renders children when open=true', () => {
    render(
      <MobileBottomSheet open onClose={vi.fn()}>
        <span>Contenido</span>
      </MobileBottomSheet>,
    )
    expect(screen.getByText('Contenido')).toBeDefined()
  })

  it('no renderiza contenido cuando open=false', () => {
    render(
      <MobileBottomSheet open={false} onClose={vi.fn()}>
        <span>Oculto</span>
      </MobileBottomSheet>,
    )
    expect(screen.queryByText('Oculto')).toBeNull()
  })

  it('llama onClose al presionar Escape', () => {
    const onClose = vi.fn()
    render(
      <MobileBottomSheet open onClose={onClose}>
        <span>x</span>
      </MobileBottomSheet>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('NO llama onClose al presionar otra tecla', () => {
    const onClose = vi.fn()
    render(
      <MobileBottomSheet open onClose={onClose}>
        <span>x</span>
      </MobileBottomSheet>,
    )
    fireEvent.keyDown(document, { key: 'Enter' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('llama onClose al hacer click en el backdrop', () => {
    const onClose = vi.fn()
    const { container } = render(
      <MobileBottomSheet open onClose={onClose}>
        <span>x</span>
      </MobileBottomSheet>,
    )
    // El backdrop es el primer motion.div (primer hijo del div fixed)
    const backdrop = container.querySelector('div[style*="rgba"]') as HTMLElement
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('aplica maxHeight personalizado al panel', () => {
    const { container } = render(
      <MobileBottomSheet open onClose={vi.fn()} maxHeight="60vh">
        <span>x</span>
      </MobileBottomSheet>,
    )
    const panel = container.querySelector('div[style*="60vh"]') as HTMLElement
    expect(panel).not.toBeNull()
  })

  it('remueve el listener de teclado al cerrarse', () => {
    const onClose = vi.fn()
    const { rerender } = render(
      <MobileBottomSheet open onClose={onClose}>
        <span>x</span>
      </MobileBottomSheet>,
    )
    rerender(
      <MobileBottomSheet open={false} onClose={onClose}>
        <span>x</span>
      </MobileBottomSheet>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })
})
