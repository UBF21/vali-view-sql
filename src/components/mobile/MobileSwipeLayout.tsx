// src/components/mobile/MobileSwipeLayout.tsx
import { useState, useRef, useCallback } from 'react'

export interface SwipeView {
  key: string
  label: string
  icon?: React.ReactNode
  color?: string
  content: React.ReactNode
}

interface MobileSwipeLayoutProps {
  views: SwipeView[]
  defaultIndex?: number
}

function tabStyle(isActive: boolean, color: string): React.CSSProperties {
  return {
    flex: 1, border: 'none', background: 'transparent',
    cursor: 'pointer', fontSize: 11, fontWeight: isActive ? 600 : 400,
    color: isActive ? color : 'var(--text-3)',
    borderBottom: `2px solid ${isActive ? color : 'transparent'}`,
    transition: 'color 0.15s, border-color 0.15s',
    fontFamily: 'inherit',
  }
}

function isHorizontalSwipe(dx: number, dy: number): boolean {
  return Math.abs(dx) >= 50 && Math.abs(dy) <= Math.abs(dx)
}

function nextIndex(dx: number, current: number, total: number): number {
  if (dx > 0 && current < total - 1) return current + 1
  if (dx < 0 && current > 0) return current - 1
  return current
}

export function MobileSwipeLayout({ views, defaultIndex = 0 }: MobileSwipeLayoutProps) {
  const [activeIndex, setActiveIndex] = useState(defaultIndex)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX
    const dy = touchStartY.current - e.changedTouches[0].clientY
    if (!isHorizontalSwipe(dx, dy)) return
    setActiveIndex(i => nextIndex(dx, i, views.length))
  }, [views.length])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
      <TabBar views={views} activeIndex={activeIndex} onSelect={setActiveIndex} />
      <ActiveView views={views} activeIndex={activeIndex} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} />
    </div>
  )
}

interface TabBarProps {
  views: SwipeView[]
  activeIndex: number
  onSelect: (i: number) => void
}

function TabBar({ views, activeIndex, onSelect }: TabBarProps) {
  return (
    <div style={{
      display: 'flex', flexShrink: 0, height: 38,
      background: 'var(--surface)', borderBottom: '1px solid var(--border)',
    }}>
      {views.map((view, i) => {
        const isActive = i === activeIndex
        const color = view.color ?? 'var(--a)'
        return (
          <button key={view.key} onClick={() => onSelect(i)} style={tabStyle(isActive, color)}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              {view.icon && <span style={{ display: 'flex', opacity: isActive ? 1 : 0.5 }}>{view.icon}</span>}
              {view.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

interface ActiveViewProps {
  views: SwipeView[]
  activeIndex: number
  onTouchStart: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
}

function ActiveView({ views, activeIndex, onTouchStart, onTouchEnd }: ActiveViewProps) {
  return (
    <div
      style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {views[activeIndex]?.content}
    </div>
  )
}
