# Responsive Mobile & Tablet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full mobile (≤768px) and tablet (769–1024px) support for vali-viewsql — swipe navigation per mode, bottom sheet mode switcher, header simplification.

**Architecture:** New `src/components/mobile/` folder with per-mode layouts and a generic swipe container. `AppShell` detects breakpoint via `useIsMobile` and renders mobile vs desktop layouts. Header gains a mobile variant.

**Tech Stack:** React, TypeScript, Framer Motion (already installed), Lucide React, Zustand, CSS custom properties.

**Spec:** `docs/superpowers/specs/2026-06-21-responsive-mobile-design.md`

---

### Task 1: `useIsMobile` hook

**Files:**
- Create: `src/hooks/useIsMobile.ts`

- [ ] **Step 1: Write the hook**

```ts
// src/hooks/useIsMobile.ts
import { useState, useEffect } from 'react'

export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= breakpoint
  )
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`)
    setIsMobile(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [breakpoint])
  return isMobile
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useIsMobile.ts
git commit -m "feat(mobile): add useIsMobile breakpoint hook"
```

---

### Task 2: `MobileBottomSheet` — reusable animated sheet

**Files:**
- Create: `src/components/mobile/MobileBottomSheet.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/mobile/MobileBottomSheet.tsx
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface MobileBottomSheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  maxHeight?: string
}

export function MobileBottomSheet({ open, onClose, children, maxHeight = '80vh' }: MobileBottomSheetProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, pointerEvents: 'all' }}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(8,8,16,0.72)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              maxHeight,
              background: 'var(--surface)',
              borderTop: '1px solid var(--border-hi)',
              borderRadius: '14px 14px 0 0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Handle */}
            <div style={{ padding: '10px 0 4px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: 32, height: 3, borderRadius: 2, background: 'var(--border-hi)' }} />
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/mobile/MobileBottomSheet.tsx
git commit -m "feat(mobile): add MobileBottomSheet reusable sheet"
```

---

### Task 3: `MobileNavSheet` — mode + dialect switcher

**Files:**
- Create: `src/components/mobile/MobileNavSheet.tsx`

- [ ] **Step 1: Write the component**

Uses `MobileBottomSheet`. Renders mode list + dialect selector.

```tsx
// src/components/mobile/MobileNavSheet.tsx
import { BookOpen, GitCompare, Play } from 'lucide-react'
import { MobileBottomSheet } from './MobileBottomSheet'
import { useAppStore } from '@/store/useAppStore'
import { DialectSelector } from '@/components/editor/DialectSelector'
import type { AppMode, Dialect } from '@/types'

const MODES: { id: AppMode; icon: React.ReactNode; label: string; desc: string }[] = [
  { id: 'explain',  icon: <BookOpen size={18} />,  label: 'Explain',  desc: 'Visualize SQL as diagram' },
  { id: 'diff',     icon: <GitCompare size={18} />, label: 'Diff',     desc: 'Compare two queries' },
  { id: 'stepper',  icon: <Play size={18} />,       label: 'Stepper',  desc: 'Step through execution' },
]

interface MobileNavSheetProps {
  open: boolean
  onClose: () => void
}

export function MobileNavSheet({ open, onClose }: MobileNavSheetProps) {
  const mode = useAppStore(s => s.mode)
  const setMode = useAppStore(s => s.setMode)
  const dialect = useAppStore(s => s.dialect)
  const setDialect = useAppStore(s => s.setDialect)

  const handleModeSelect = (m: AppMode) => { setMode(m); onClose() }

  return (
    <MobileBottomSheet open={open} onClose={onClose} maxHeight="60vh">
      <div style={{ padding: '4px 0 8px', overflowY: 'auto' }}>
        <p style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 16px 8px' }}>
          Switch mode
        </p>

        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => handleModeSelect(m.id)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', background: mode === m.id ? 'var(--a-soft)' : 'transparent',
              border: 'none', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <span style={{ color: mode === m.id ? 'var(--a)' : 'var(--text-2)', flexShrink: 0 }}>{m.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: mode === m.id ? 'var(--a)' : 'var(--text-1)' }}>{m.label}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{m.desc}</div>
            </div>
          </button>
        ))}

        <div style={{ margin: '8px 16px 0', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <p style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Dialect
          </p>
          <DialectSelector value={dialect} onChange={(d: Dialect) => setDialect(d)} />
        </div>

        <div style={{ height: 'env(safe-area-inset-bottom, 8px)' }} />
      </div>
    </MobileBottomSheet>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/mobile/MobileNavSheet.tsx
git commit -m "feat(mobile): add MobileNavSheet mode + dialect switcher"
```

---

### Task 4: Header — mobile variant

**Files:**
- Modify: `src/components/layout/Header.tsx`

- [ ] **Step 1: Read current Header to confirm imports**

File is at `src/components/layout/Header.tsx`. Currently imports: `Link2, Sun, Moon, Database` from lucide-react. Uses `useAppStore` for theme/dialect/mode.

- [ ] **Step 2: Rewrite Header with mobile branch**

Replace the file content with:

```tsx
// src/components/layout/Header.tsx
import { useState, useCallback } from 'react'
import { Link2, Sun, Moon, Database, Menu } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { DialectSelector } from '@/components/editor/DialectSelector'
import { Toast } from '@/components/ui/Toast'
import { MobileNavSheet } from '@/components/mobile/MobileNavSheet'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { Dialect, AppMode } from '@/types'

export function Header() {
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)
  const dialect = useAppStore((s) => s.dialect)
  const setDialect = useAppStore((s) => s.setDialect)
  const mode = useAppStore((s) => s.mode)
  const setMode = useAppStore((s) => s.setMode)
  const [toastVisible, setToastVisible] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const isMobile = useIsMobile()

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => setToastVisible(true))
      .catch(console.error)
  }, [])

  const Logo = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        className="logo-icon-glow"
        style={{
          width: 26, height: 26,
          background: 'linear-gradient(135deg, #C8880A, #C04820)',
          borderRadius: 7,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Database size={14} color="#fff" />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-1)', whiteSpace: 'nowrap' }}>
        Vali-View-<span style={{ color: 'var(--a)' }}>SQL</span>
      </span>
      {!isMobile && (
        <span style={{ fontSize: 9, fontWeight: 600, background: 'var(--a-soft)', color: 'var(--a)', border: '1px solid var(--a-border)', borderRadius: 4, padding: '1px 6px', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          SQL Explainer
        </span>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <>
        <header
          className="app-header"
          style={{
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          {Logo}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              style={{
                background: 'transparent', border: 'none',
                width: 36, height: 36, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-2)',
              }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={() => setNavOpen(true)}
              aria-label="Open navigation menu"
              style={{
                background: 'var(--elevated)', border: '1px solid var(--border)',
                borderRadius: 8, width: 36, height: 36,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-1)',
              }}
            >
              <Menu size={18} />
            </button>
          </div>
        </header>
        <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />
        <Toast message="Link copied! 🔗" visible={toastVisible} onHide={() => setToastVisible(false)} />
      </>
    )
  }

  return (
    <>
      <header
        className="app-header"
        style={{
          height: 48,
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          padding: '0 16px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        {Logo}

        <div className="mode-tabs" style={{ display: 'flex', alignSelf: 'stretch', alignItems: 'stretch' }}>
          {(['explain', 'diff', 'stepper'] as AppMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              aria-label={`Switch to ${m} mode`}
              className={`mode-tab${mode === m ? ' active' : ''}`}
            >
              {m}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          <DialectSelector value={dialect} onChange={(d: Dialect) => setDialect(d)} />
          <button
            onClick={copyLink}
            aria-label="Copy shareable link"
            title="Copy shareable link"
            style={{
              background: 'var(--elevated)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
              fontSize: 12, color: 'var(--text-2)',
              display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
            }}
          >
            <Link2 size={13} strokeWidth={2} />
            <span>Copy Link</span>
          </button>
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            style={{
              background: 'var(--elevated)', border: '1px solid var(--border)',
              borderRadius: 6, width: 30, height: 30, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-2)', flexShrink: 0,
            }}
          >
            {theme === 'dark' ? <Sun size={15} strokeWidth={2} /> : <Moon size={15} strokeWidth={2} />}
          </button>
        </div>
      </header>
      <Toast message="Link copied! 🔗" visible={toastVisible} onHide={() => setToastVisible(false)} />
    </>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in Header.tsx or its imports.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "feat(mobile): header shows logo+menu on mobile, full layout on desktop"
```

---

### Task 5: `MobileSwipeLayout` — generic swipeable container

**Files:**
- Create: `src/components/mobile/MobileSwipeLayout.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/mobile/MobileSwipeLayout.tsx
import { useState, useRef, useCallback } from 'react'

export interface SwipeView {
  key: string
  label: string
  color?: string
  content: React.ReactNode
}

interface MobileSwipeLayoutProps {
  views: SwipeView[]
  defaultIndex?: number
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
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return
    if (dx > 0 && activeIndex < views.length - 1) setActiveIndex(i => i + 1)
    if (dx < 0 && activeIndex > 0) setActiveIndex(i => i - 1)
  }, [activeIndex, views.length])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', flexShrink: 0, height: 38,
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      }}>
        {views.map((view, i) => {
          const isActive = i === activeIndex
          const color = view.color ?? 'var(--a)'
          return (
            <button
              key={view.key}
              onClick={() => setActiveIndex(i)}
              style={{
                flex: 1, border: 'none', background: 'transparent',
                cursor: 'pointer', fontSize: 11, fontWeight: isActive ? 600 : 400,
                color: isActive ? color : 'var(--text-3)',
                borderBottom: `2px solid ${isActive ? color : 'transparent'}`,
                transition: 'color 0.15s, border-color 0.15s',
                fontFamily: 'inherit',
              }}
            >
              {view.label}
            </button>
          )
        })}
      </div>

      {/* Active view */}
      <div
        style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {views[activeIndex]?.content}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/mobile/MobileSwipeLayout.tsx
git commit -m "feat(mobile): add MobileSwipeLayout generic swipeable container"
```

---

### Task 6: `MobileExplainLayout` — 3-view swipe for Explain mode

**Files:**
- Create: `src/components/mobile/MobileExplainLayout.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/mobile/MobileExplainLayout.tsx
import { useMemo } from 'react'
import { MobileSwipeLayout } from './MobileSwipeLayout'
import { QueryEditor } from '@/components/editor/QueryEditor'
import { DiagramCanvas } from '@/components/diagram/DiagramCanvas'
import { PanelRight } from '@/components/layout/PanelRight'
import { ExportButton } from '@/components/diagram/ExportButton'
import { HistoryPicker } from '@/components/editor/HistoryPicker'
import { ExamplePicker } from '@/components/editor/ExamplePicker'
import { useAppStore } from '@/store/useAppStore'
import type { Node, Edge, SQLNodeData } from '@/types'

interface MobileExplainLayoutProps {
  nodes: Node<SQLNodeData>[]
  edges: Edge[]
  isLoading: boolean
  highlightClause?: string
}

export function MobileExplainLayout({ nodes, edges, isLoading, highlightClause }: MobileExplainLayoutProps) {
  const query = useAppStore(s => s.query)
  const setQuery = useAppStore(s => s.setQuery)

  const views = useMemo(() => [
    {
      key: 'editor',
      label: '✏️ Editor',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: 12, gap: 8 }}>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <HistoryPicker />
            <ExamplePicker />
          </div>
          <QueryEditor value={query} onChange={setQuery} style={{ flex: 1 }} highlightClause={highlightClause} />
        </div>
      ),
    },
    {
      key: 'diagram',
      label: '⬡ Diagram',
      content: (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <DiagramCanvas nodes={nodes} edges={edges} isLoading={isLoading} />
          <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 5 }}>
            <ExportButton />
          </div>
        </div>
      ),
    },
    {
      key: 'analysis',
      label: '📊 Analysis',
      content: <PanelRight />,
    },
  ], [query, setQuery, nodes, edges, isLoading, highlightClause])

  return <MobileSwipeLayout views={views} defaultIndex={1} />
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/mobile/MobileExplainLayout.tsx
git commit -m "feat(mobile): add MobileExplainLayout 3-view swipe for Explain mode"
```

---

### Task 7: `MobileDiffLayout` — 2-view swipe for Diff mode

**Files:**
- Create: `src/components/mobile/MobileDiffLayout.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/mobile/MobileDiffLayout.tsx
import { useMemo } from 'react'
import { MobileSwipeLayout } from './MobileSwipeLayout'
import { DiagramCanvas } from '@/components/diagram/DiagramCanvas'
import { DiffSummaryBar } from '@/components/diagram/DiffSummaryBar'
import { QueryEditor } from '@/components/editor/QueryEditor'
import { useDiff } from '@/hooks/useDiff'
import { useAppStore } from '@/store/useAppStore'

export function MobileDiffLayout() {
  const query = useAppStore(s => s.query)
  const queryB = useAppStore(s => s.queryB)
  const setQuery = useAppStore(s => s.setQuery)
  const setQueryB = useAppStore(s => s.setQueryB)
  const { diff: diffData } = useDiff()

  const views = useMemo(() => [
    {
      key: 'queryA',
      label: 'Query A',
      color: '#3B82F6',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div style={{ flex: '0 0 38%', padding: 10, overflow: 'hidden' }}>
            <QueryEditor value={query} onChange={setQuery} style={{ height: '100%' }} />
          </div>
          <div style={{ flex: 1, overflow: 'hidden', borderTop: '1px solid var(--border)', position: 'relative' }}>
            <DiagramCanvas
              nodes={(diffData?.nodesA ?? []) as never}
              edges={(diffData?.edgesA ?? []) as never}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'queryB',
      label: 'Query B',
      color: '#F97316',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div style={{ flex: '0 0 38%', padding: 10, overflow: 'hidden' }}>
            <QueryEditor value={queryB} onChange={setQueryB} style={{ height: '100%' }} />
          </div>
          <div style={{ flex: 1, overflow: 'hidden', borderTop: '1px solid var(--border)', position: 'relative' }}>
            <DiagramCanvas
              nodes={(diffData?.nodesB ?? []) as never}
              edges={(diffData?.edgesB ?? []) as never}
            />
          </div>
        </div>
      ),
    },
  ], [query, queryB, setQuery, setQueryB, diffData])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
      <DiffSummaryBar diff={diffData?.diff} />
      <MobileSwipeLayout views={views} defaultIndex={0} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/mobile/MobileDiffLayout.tsx
git commit -m "feat(mobile): add MobileDiffLayout 2-view swipe for Diff mode"
```

---

### Task 8: `MobileStepperLayout` — canvas + FAB + stepper bar

**Files:**
- Create: `src/components/mobile/MobileStepperLayout.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/mobile/MobileStepperLayout.tsx
import { useState, useCallback } from 'react'
import { Pencil, X } from 'lucide-react'
import { DiagramCanvas } from '@/components/diagram/DiagramCanvas'
import { StepperControls } from '@/components/diagram/StepperControls'
import { QueryEditor } from '@/components/editor/QueryEditor'
import { HistoryPicker } from '@/components/editor/HistoryPicker'
import { ExamplePicker } from '@/components/editor/ExamplePicker'
import { MobileBottomSheet } from './MobileBottomSheet'
import { useAppStore } from '@/store/useAppStore'
import type { Node, Edge, SQLNodeData } from '@/types'
import type { StepAnimationState } from '@/hooks/useStepAnimation'

interface MobileStepperLayoutProps {
  nodes: Node<SQLNodeData>[]
  edges: Edge[]
  isLoading: boolean
  stepAnimation: StepAnimationState
  highlightClause?: string
}

export function MobileStepperLayout({ nodes, edges, isLoading, stepAnimation, highlightClause }: MobileStepperLayoutProps) {
  const query = useAppStore(s => s.query)
  const setQuery = useAppStore(s => s.setQuery)
  const [editorOpen, setEditorOpen] = useState(false)

  const openEditor = useCallback(() => setEditorOpen(true), [])
  const closeEditor = useCallback(() => setEditorOpen(false), [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <DiagramCanvas nodes={nodes} edges={edges} isLoading={isLoading} />

        {/* FAB SQL */}
        <button
          onClick={openEditor}
          aria-label="Open SQL editor"
          style={{
            position: 'absolute', bottom: 12, left: 12, zIndex: 20,
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(13,13,22,0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--border-hi)',
            borderRadius: 20, padding: '8px 14px',
            cursor: 'pointer', color: 'var(--text-1)',
            fontSize: 12, fontWeight: 500,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            fontFamily: 'inherit',
          }}
        >
          <Pencil size={13} />
          SQL
        </button>
      </div>

      {/* Stepper controls */}
      <StepperControls state={stepAnimation} />

      {/* SQL editor bottom sheet */}
      <MobileBottomSheet open={editorOpen} onClose={closeEditor} maxHeight="70vh">
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: '8px 12px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>SQL Query</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <HistoryPicker />
              <ExamplePicker />
              <button
                onClick={closeEditor}
                style={{ background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-2)' }}
              >
                <X size={12} />
              </button>
            </div>
          </div>
          <QueryEditor value={query} onChange={setQuery} style={{ flex: 1 }} highlightClause={highlightClause} />
        </div>
      </MobileBottomSheet>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/mobile/MobileStepperLayout.tsx
git commit -m "feat(mobile): add MobileStepperLayout canvas+FAB+stepper bar"
```

---

### Task 9: `AppShell` integration

**Files:**
- Modify: `src/components/layout/AppShell.tsx`

- [ ] **Step 1: Add mobile imports and hook**

At the top of `AppShell.tsx`, add after existing imports:

```tsx
import { useIsMobile } from '@/hooks/useIsMobile'
import { MobileExplainLayout } from '@/components/mobile/MobileExplainLayout'
import { MobileDiffLayout } from '@/components/mobile/MobileDiffLayout'
import { MobileStepperLayout } from '@/components/mobile/MobileStepperLayout'
```

- [ ] **Step 2: Add `isMobile` hook call**

Inside `AppShell()`, after the existing `const stepAnimation = useStepAnimation(steps)` line, add:

```tsx
const isMobile = useIsMobile()
```

- [ ] **Step 3: Add mobile content branches**

After the existing `const stepperContent = (...)` block, add:

```tsx
const mobileExplainContent = (
  <MobileExplainLayout
    nodes={nodes}
    edges={edges}
    isLoading={isLoading}
    highlightClause={highlightClause}
  />
)

const mobileDiffContent = <MobileDiffLayout />

const mobileStepperContent = (
  <MobileStepperLayout
    nodes={stepNodes}
    edges={stepEdges}
    isLoading={isLoading}
    stepAnimation={stepAnimation}
    highlightClause={highlightClause}
  />
)
```

- [ ] **Step 4: Update the return's mode dispatch**

Change the return body from:

```tsx
{mode === 'stepper' ? stepperContent : mode === 'diff' ? diffContent : explainContent}
```

To:

```tsx
{isMobile
  ? (mode === 'stepper' ? mobileStepperContent : mode === 'diff' ? mobileDiffContent : mobileExplainContent)
  : (mode === 'stepper' ? stepperContent : mode === 'diff' ? diffContent : explainContent)
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/AppShell.tsx
git commit -m "feat(mobile): AppShell uses mobile layouts when isMobile"
```

---

### Task 10: CSS — update breakpoints + mobile polish

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Replace the existing responsive section**

Find the `/* ═══ RESPONSIVE ═══ */` block (currently at ~line 602) and replace it:

```css
/* ═══════════════════════════════════════
   RESPONSIVE
═══════════════════════════════════════ */

/* Tablet 769–1024px: drawers + FABs (explain only) */
@media (max-width: 1024px) {
  .app-body {
    grid-template-columns: 1fr !important;
  }
  .side-panel-left,
  .side-panel-right {
    display: none !important;
  }
  .drawer-overlay {
    display: block;
  }
  .fab-bar {
    display: flex;
  }
}

/* Mobile ≤768px — handled by React components, minimal CSS overrides */
@media (max-width: 768px) {
  /* StepperControls: hide keyboard hint on mobile */
  .stepper-keyboard-hint {
    display: none !important;
  }

  /* Ensure ReactFlow controls don't overlap FAB */
  .react-flow__controls {
    bottom: auto !important;
    top: 8px !important;
    right: 8px !important;
    left: auto !important;
  }
}

/* Tiny screens */
@media (max-width: 340px) {
  .orient-note {
    display: flex !important;
  }
}
```

- [ ] **Step 2: Add `.stepper-keyboard-hint` class to `StepperControls.tsx`**

In `src/components/diagram/StepperControls.tsx`, find the keyboard hint div:

```tsx
<div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.03em' }}>
  ← → navigate · Space play/pause · Home first · End last
</div>
```

Add `className="stepper-keyboard-hint"` to it:

```tsx
<div className="stepper-keyboard-hint" style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.03em' }}>
  ← → navigate · Space play/pause · Home first · End last
</div>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add src/index.css src/components/diagram/StepperControls.tsx
git commit -m "feat(mobile): update CSS breakpoints, hide keyboard hint on mobile"
```

---

### Task 11: Barrel export for mobile components

**Files:**
- Create: `src/components/mobile/index.ts`

- [ ] **Step 1: Write the barrel**

```ts
// src/components/mobile/index.ts
export { MobileBottomSheet } from './MobileBottomSheet'
export { MobileNavSheet } from './MobileNavSheet'
export { MobileSwipeLayout } from './MobileSwipeLayout'
export { MobileExplainLayout } from './MobileExplainLayout'
export { MobileDiffLayout } from './MobileDiffLayout'
export { MobileStepperLayout } from './MobileStepperLayout'
```

- [ ] **Step 2: Final build check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 3: Run existing tests**

```bash
npx vitest run 2>&1 | tail -20
```

Expected: all existing tests still pass (mobile components have no tests to break).

- [ ] **Step 4: Final commit**

```bash
git add src/components/mobile/index.ts
git commit -m "feat(mobile): barrel export for mobile components"
```
