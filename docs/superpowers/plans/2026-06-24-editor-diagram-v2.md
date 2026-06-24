# Editor & Diagram v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add edge labels on JOIN edges, zoom controls, scroll-to-clause, SQL snippets, and inline error markers to vali-viewsql.

**Architecture:** LabeledJoinEdge is a custom ReactFlow edge type registered via `edgeTypes`. Zoom functions are bridged from ReactFlow context to Zustand store (`zoomControls` field), then consumed by ZoomButtons component alongside ExportButton. Snippets use a `pendingSnippet` store field that QueryEditor observes to insert/replace. Inline markers use an absolutely-positioned overlay div that tracks textarea scroll via a ref.

**Tech Stack:** React 19 + TypeScript strict + Vite + Vitest + Zustand + @xyflow/react + lucide-react

---

## Task 1: LabeledJoinEdge — edge labels on JOIN conditions

**Files:**
- Create: `src/components/diagram/edges/LabeledJoinEdge.tsx`
- Modify: `src/lib/parser/ast-to-graph.ts` — `makeJoinEdge` signature + call at line 269
- Modify: `src/components/diagram/DiagramCanvas.tsx` — import + register `edgeTypes`
- Create: `src/__tests__/components/LabeledJoinEdge.spec.tsx`

- [ ] **Step 1: Create `LabeledJoinEdge.tsx`**

```tsx
// src/components/diagram/edges/LabeledJoinEdge.tsx
import { useState } from 'react'
import { getBezierPath, EdgeLabelRenderer, BaseEdge, type EdgeProps } from '@xyflow/react'

export function LabeledJoinEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data, style, markerEnd,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false)
  const onCondition = (data as { onCondition?: string } | undefined)?.onCondition ?? ''

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
            zIndex: 10,
          }}
          className="nodrag nopan"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <span style={{
            background: 'var(--surface)',
            border: '1px solid rgba(93,202,165,0.4)',
            borderRadius: 3,
            padding: '1px 5px',
            fontSize: 9,
            color: '#5DCAA5',
            fontFamily: 'monospace',
            cursor: 'default',
            whiteSpace: 'nowrap',
            display: 'inline-block',
          }}>
            ON ···
          </span>
          {hovered && onCondition && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: 6,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '6px 8px',
              fontSize: 10,
              color: 'var(--text-1)',
              fontFamily: 'monospace',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              zIndex: 100,
              maxWidth: 280,
              whiteSpace: 'normal',
              wordBreak: 'break-word',
            }}>
              {onCondition}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
```

- [ ] **Step 2: Modify `makeJoinEdge` in `ast-to-graph.ts` (line 657)**

Find `makeJoinEdge` at line 657 and replace with:

```ts
function makeJoinEdge(source: string, target: string, targetHandle?: string, onCondition?: string): Edge {
  return {
    id: `e-${source}-${target}-${targetHandle ?? ''}`,
    source,
    target,
    targetHandle,
    ...(onCondition ? { type: 'labeled-join', data: { onCondition } } : {}),
    animated: true,
    style: { stroke: '#5DCAA5', strokeWidth: 1.5, strokeDasharray: '5,4' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#5DCAA5' },
  }
}
```

Then update the call at line 269 (the `joinedTableId → joinId` edge):
```ts
edges.push(makeJoinEdge(joinedTableId, joinId, 'right', onCondition))
```
(Lines 264 and 267 keep their existing calls without `onCondition` — they're left-side source edges.)

- [ ] **Step 3: Register `edgeTypes` in `DiagramCanvas.tsx`**

Add import at top:
```tsx
import { LabeledJoinEdge } from './edges/LabeledJoinEdge'
```

Add constant before `FlowCanvas`:
```tsx
const EDGE_TYPES = { 'labeled-join': LabeledJoinEdge }
```

In `FlowCanvas`, update the `<ReactFlow>` element to include `edgeTypes`:
```tsx
<ReactFlow
  nodes={nodes} edges={edges} nodeTypes={customNodeTypes} edgeTypes={EDGE_TYPES}
  onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
  onNodeClick={handleNodeClick} fitView fitViewOptions={{ padding: 0.2 }}
  minZoom={0.3} maxZoom={2} proOptions={{ hideAttribution: true }}
  style={FLOW_STYLE}
>
  <Controls />
</ReactFlow>
```

- [ ] **Step 4: Write the failing test**

```tsx
// src/__tests__/components/LabeledJoinEdge.spec.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LabeledJoinEdge } from '@/components/diagram/edges/LabeledJoinEdge'
import { Position } from '@xyflow/react'

vi.mock('@xyflow/react', () => ({
  getBezierPath: () => ['M0,0', 50, 50],
  BaseEdge: ({ id }: { id: string }) => <svg><path data-testid={`base-edge-${id}`} /></svg>,
  EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const BASE_PROPS = {
  id: 'e1', source: 'a', target: 'b',
  sourceX: 0, sourceY: 0, targetX: 100, targetY: 100,
  sourcePosition: Position.Bottom, targetPosition: Position.Top,
  selected: false, animated: false, data: {},
  style: {}, markerEnd: undefined, markerStart: undefined,
  label: undefined, labelStyle: undefined, labelShowBg: false,
  labelBgStyle: undefined, labelBgPadding: [0, 0] as [number, number],
  labelBgBorderRadius: 0, interactionWidth: 20,
}

describe('LabeledJoinEdge', () => {
  it('renders the ON pill', () => {
    render(<LabeledJoinEdge {...BASE_PROPS} data={{ onCondition: 'a.id = b.a_id' }} />)
    expect(screen.getByText('ON ···')).toBeTruthy()
  })

  it('shows tooltip on hover', () => {
    render(<LabeledJoinEdge {...BASE_PROPS} data={{ onCondition: 'a.id = b.a_id' }} />)
    fireEvent.mouseEnter(screen.getByText('ON ···').parentElement!)
    expect(screen.getByText('a.id = b.a_id')).toBeTruthy()
  })

  it('hides tooltip when not hovered', () => {
    render(<LabeledJoinEdge {...BASE_PROPS} data={{ onCondition: 'a.id = b.a_id' }} />)
    expect(screen.queryByText('a.id = b.a_id')).toBeNull()
  })

  it('renders pill even with empty onCondition', () => {
    render(<LabeledJoinEdge {...BASE_PROPS} data={{}} />)
    expect(screen.getByText('ON ···')).toBeTruthy()
  })
})
```

- [ ] **Step 5: Run test to confirm it passes**

```
npm run test -- src/__tests__/components/LabeledJoinEdge.spec.tsx
```

Expected: all 4 tests pass.

- [ ] **Step 6: Run full suite**

```
npm run test
```

Expected: 601+ tests passing, 0 failing.

- [ ] **Step 7: Commit**

```
git add src/components/diagram/edges/LabeledJoinEdge.tsx \
        src/lib/parser/ast-to-graph.ts \
        src/components/diagram/DiagramCanvas.tsx \
        src/__tests__/components/LabeledJoinEdge.spec.tsx
git commit -m "feat(diagram): add ON condition labels to JOIN edges"
```

---

## Task 2: Zoom Controls — +/−/Fit buttons alongside ExportButton

**Files:**
- Modify: `src/store/useAppStore.ts` — add `zoomControls` field
- Modify: `src/components/diagram/DiagramCanvas.tsx` — bridge zoom fns to store; remove `<Controls />`
- Create: `src/components/diagram/ZoomButtons.tsx`
- Modify: `src/components/layout/AppShell.tsx` — render ZoomButtons next to ExportButton
- Create: `src/__tests__/components/ZoomButtons.spec.tsx`

- [ ] **Step 1: Add `zoomControls` to the store interface and implementation in `useAppStore.ts`**

In the `AppStore` interface (around line 25-68), add after the `clearSchema` line:

```ts
zoomControls: { zoomIn: () => void; zoomOut: () => void; fitView: (opts?: { padding?: number }) => void } | null
setZoomControls: (c: { zoomIn: () => void; zoomOut: () => void; fitView: (opts?: { padding?: number }) => void } | null) => void
```

In the `create` call (around line 70), after `clearSchema: () => set({ schema: null }),` add:

```ts
zoomControls: null,
setZoomControls: (zoomControls) => set({ zoomControls }),
```

Note: `zoomControls` must NOT be persisted — do not add it to the `partialize` function (line 150-154).

- [ ] **Step 2: Bridge zoom functions in `FlowCanvas` in `DiagramCanvas.tsx`**

Add imports at top of file:
```tsx
import { useEffect, useCallback, useRef, type CSSProperties } from 'react'
import {
  ReactFlow,
  useNodesState, useEdgesState, useReactFlow,
  type Node, type Edge, type NodeMouseHandler,
  type OnNodesChange, type OnEdgesChange,
} from '@xyflow/react'
```

(Remove `Controls` from the import — it's no longer needed.)

Inside `FlowCanvas` function body (after the `handleNodeClick` callback), add:

```tsx
const { zoomIn, zoomOut, fitView } = useReactFlow()
const setZoomControls = useAppStore(s => s.setZoomControls)

useEffect(() => {
  setZoomControls({ zoomIn, zoomOut, fitView })
  return () => setZoomControls(null)
}, [setZoomControls, zoomIn, zoomOut, fitView])
```

Remove `<Controls />` from the `<ReactFlow>` children (line 62 currently).

`useReactFlow()` works inside `FlowCanvas` because `<ReactFlow>` creates a ReactFlow context; hooks that use it must be in children of `<ReactFlow>`. In the current component structure, `FlowCanvas` renders `<ReactFlow>` — `useReactFlow()` in `FlowCanvas` itself is valid because `DiagramCanvas` renders `FlowCanvas` inside a ReactFlow provider scope via the parent `<ReactFlow>` wrapper. 

Wait — actually `useReactFlow()` must be called inside a `ReactFlowProvider`. The `<ReactFlow>` component IS a ReactFlowProvider. So `useReactFlow()` works in any descendant of `<ReactFlow>`. `FlowCanvas` renders `<ReactFlow>`, so `FlowCanvas` itself is NOT inside a ReactFlowProvider.

**Correct approach**: Move `useReactFlow()` into a small inner component that renders inside `<ReactFlow>`:

Replace the `<ReactFlow>` children block in FlowCanvas with:

```tsx
<ReactFlow
  nodes={nodes} edges={edges} nodeTypes={customNodeTypes} edgeTypes={EDGE_TYPES}
  onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
  onNodeClick={handleNodeClick} fitView fitViewOptions={{ padding: 0.2 }}
  minZoom={0.3} maxZoom={2} proOptions={{ hideAttribution: true }}
  style={FLOW_STYLE}
>
  <ZoomBridge />
</ReactFlow>
```

And add this component before `FlowCanvas`:

```tsx
function ZoomBridge() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const setZoomControls = useAppStore(s => s.setZoomControls)

  useEffect(() => {
    setZoomControls({ zoomIn, zoomOut, fitView })
    return () => setZoomControls(null)
  }, [setZoomControls, zoomIn, zoomOut, fitView])

  return null
}
```

- [ ] **Step 3: Create `ZoomButtons.tsx`**

```tsx
// src/components/diagram/ZoomButtons.tsx
import { Minus, Plus, Maximize2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

const BTN: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6,
  padding: '4px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 600,
  color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
}

export function ZoomButtons() {
  const zoomControls = useAppStore(s => s.zoomControls)
  if (!zoomControls) return null

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <button style={BTN} onClick={() => zoomControls.zoomIn()} aria-label="Zoom in" title="Zoom in">
        <Plus size={12} />
      </button>
      <button style={BTN} onClick={() => zoomControls.zoomOut()} aria-label="Zoom out" title="Zoom out">
        <Minus size={12} />
      </button>
      <button style={BTN} onClick={() => zoomControls.fitView({ padding: 0.2 })} aria-label="Fit to view" title="Fit to view">
        <Maximize2 size={12} />
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Update `AppShell.tsx` to render ZoomButtons**

Add import near the ExportButton import (around line 12-13):
```tsx
import { ZoomButtons } from '@/components/diagram/ZoomButtons'
```

Find the overlay div at line 266-268:
```tsx
<div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 5 }}>
  <ExportButton />
</div>
```

Replace with:
```tsx
<div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
  <ZoomButtons />
  <ExportButton />
</div>
```

- [ ] **Step 5: Update `DiagramCanvas.spec.tsx` mock for `useReactFlow`**

The existing mock at line 6-11 mocks `@xyflow/react`. Add `useReactFlow` to the mock:

```tsx
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: { children: React.ReactNode }) => <div data-testid="reactflow">{children}</div>,
  useNodesState: (n: unknown[]) => [n, vi.fn(), vi.fn()] as const,
  useEdgesState: (e: unknown[]) => [e, vi.fn(), vi.fn()] as const,
  useReactFlow: () => ({ zoomIn: vi.fn(), zoomOut: vi.fn(), fitView: vi.fn() }),
}))
```

Also update the `useAppStore` mock to include `setZoomControls`:
```tsx
vi.mock('@/store/useAppStore', () => ({
  useAppStore: (sel: (s: { setInfoNode: () => void; complexityResult: null; setZoomControls: () => void }) => unknown) =>
    sel({ setInfoNode: vi.fn(), complexityResult: null, setZoomControls: vi.fn() }),
}))
```

- [ ] **Step 6: Write the ZoomButtons test**

```tsx
// src/__tests__/components/ZoomButtons.spec.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
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
```

- [ ] **Step 7: Run tests**

```
npm run test -- src/__tests__/components/ZoomButtons.spec.tsx
npm run test -- src/__tests__/components/DiagramCanvas.spec.tsx
```

Expected: both pass.

- [ ] **Step 8: Run full suite**

```
npm run test
```

Expected: 601+ tests passing, 0 failing.

- [ ] **Step 9: Commit**

```
git add src/store/useAppStore.ts \
        src/components/diagram/DiagramCanvas.tsx \
        src/components/diagram/ZoomButtons.tsx \
        src/components/layout/AppShell.tsx \
        src/__tests__/components/ZoomButtons.spec.tsx \
        src/__tests__/components/DiagramCanvas.spec.tsx
git commit -m "feat(diagram): add zoom +/−/Fit controls alongside export buttons"
```

---

## Task 3: Scroll-to-clause — auto-scroll editor when clicking a diagram node

**Files:**
- Modify: `src/components/editor/QueryEditor.tsx` — add `useEffect` on `highlightClause`

- [ ] **Step 1: Add `useEffect` import and scroll effect to `QueryEditor.tsx`**

Update the import at line 1:
```tsx
import { useRef, useCallback, useMemo, useEffect } from 'react'
```

Add this effect inside `QueryEditor` (after the existing `useMemo` for `highlighted`, before `handleChange`):

```tsx
useEffect(() => {
  if (!highlightClause || !textareaRef.current) return
  const textarea = textareaRef.current
  const idx = value.indexOf(highlightClause)
  if (idx === -1) return
  const linesBefore = value.substring(0, idx).split('\n').length - 1
  const lineHeightPx = 13 * 1.6
  const paddingTop = 12
  const targetTop = paddingTop + linesBefore * lineHeightPx
  const scrollTop = Math.max(0, targetTop - textarea.clientHeight / 3)
  textarea.scrollTop = scrollTop
  if (scrollRef.current) scrollRef.current.scrollTop = scrollTop
}, [highlightClause, value])
```

- [ ] **Step 2: Run TypeScript check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run full suite**

```
npm run test
```

Expected: same count as before, 0 failing.

- [ ] **Step 4: Commit**

```
git add src/components/editor/QueryEditor.tsx
git commit -m "feat(editor): scroll textarea to highlighted clause when clicking diagram node"
```

---

## Task 4: Snippets — SQL template picker in the editor toolbar

**Files:**
- Create: `src/lib/snippets.ts`
- Modify: `src/store/useAppStore.ts` — add `pendingSnippet` field
- Create: `src/components/editor/SnippetPicker.tsx`
- Modify: `src/components/editor/QueryEditor.tsx` — add props + insertion effect
- Modify: `src/components/layout/AppShell.tsx` — wire store + render SnippetPicker
- Create: `src/__tests__/components/SnippetPicker.spec.tsx`

- [ ] **Step 1: Create `src/lib/snippets.ts`**

```ts
export interface Snippet {
  id: string
  title: string
  description: string
  sql: string
}

export const SNIPPETS: Snippet[] = [
  {
    id: 'select-join',
    title: 'SELECT with JOIN',
    description: 'INNER JOIN between two tables',
    sql: `SELECT\n  a.id,\n  a.name,\n  b.value\nFROM table_a a\nINNER JOIN table_b b ON a.id = b.a_id\nWHERE a.active = true\nORDER BY a.id;`,
  },
  {
    id: 'cte',
    title: 'WITH (CTE)',
    description: 'Common table expression with ROW_NUMBER',
    sql: `WITH ranked AS (\n  SELECT\n    id,\n    name,\n    ROW_NUMBER() OVER (PARTITION BY category ORDER BY created_at DESC) AS rn\n  FROM items\n)\nSELECT *\nFROM ranked\nWHERE rn = 1;`,
  },
  {
    id: 'subquery',
    title: 'Subquery in SELECT',
    description: 'Scalar subquery counted per row',
    sql: `SELECT\n  u.id,\n  u.name,\n  (\n    SELECT COUNT(*)\n    FROM orders o\n    WHERE o.user_id = u.id\n  ) AS order_count\nFROM users u;`,
  },
  {
    id: 'window',
    title: 'Window function',
    description: 'RANK and AVG over a partition',
    sql: `SELECT\n  id,\n  name,\n  salary,\n  AVG(salary) OVER (PARTITION BY department_id) AS dept_avg,\n  RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS salary_rank\nFROM employees;`,
  },
  {
    id: 'group-by',
    title: 'GROUP BY + HAVING',
    description: 'Aggregate counts with HAVING filter',
    sql: `SELECT\n  department_id,\n  COUNT(*) AS total,\n  AVG(salary) AS avg_salary,\n  MAX(salary) AS max_salary\nFROM employees\nGROUP BY department_id\nHAVING COUNT(*) > 5\nORDER BY avg_salary DESC;`,
  },
]
```

- [ ] **Step 2: Add `pendingSnippet` to `useAppStore.ts`**

In the `AppStore` interface (after `setZoomControls` line), add:

```ts
pendingSnippet: string | null
setPendingSnippet: (sql: string) => void
clearPendingSnippet: () => void
```

In the `create` call, add after `setZoomControls`:

```ts
pendingSnippet: null,
setPendingSnippet: (pendingSnippet) => set({ pendingSnippet }),
clearPendingSnippet: () => set({ pendingSnippet: null }),
```

`pendingSnippet` must NOT be persisted — do not add to `partialize`.

- [ ] **Step 3: Create `src/components/editor/SnippetPicker.tsx`**

```tsx
import { useState, useRef, useCallback, useEffect } from 'react'
import { Code2, ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { SNIPPETS } from '@/lib/snippets'

function useDropdownClose(ref: React.RefObject<HTMLDivElement | null>, open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose, ref])
}

function SnippetItem({ title, description, onClick }: { title: string; description: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
      background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)',
      cursor: 'pointer',
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{description}</div>
    </button>
  )
}

function Dropdown({ pos, onPick }: { pos: { top: number; left: number }; onPick: (sql: string) => void }) {
  return (
    <div style={{
      position: 'fixed', top: pos.top, left: pos.left, width: 260, maxHeight: 340,
      overflowY: 'auto', background: 'var(--surface)',
      border: '1px solid var(--border)', borderRadius: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,.5)', zIndex: 9999,
    }}>
      <div style={{
        padding: '6px 12px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)',
      }}>
        Templates
      </div>
      {SNIPPETS.map(s => (
        <SnippetItem key={s.id} title={s.title} description={s.description} onClick={() => onPick(s.sql)} />
      ))}
    </div>
  )
}

export function SnippetPicker() {
  const setPendingSnippet = useAppStore(s => s.setPendingSnippet)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const close = useCallback(() => setOpen(false), [])
  useDropdownClose(ref, open, close)

  const handleOpen = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left })
    }
    setOpen(v => !v)
  }

  const handlePick = useCallback((sql: string) => {
    setPendingSnippet(sql)
    setOpen(false)
  }, [setPendingSnippet])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        onClick={handleOpen}
        aria-label="Insert a SQL snippet"
        style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6,
          padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600,
          color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        <Code2 size={11} /> Snippets <ChevronDown size={12} />
      </button>
      {open && <Dropdown pos={pos} onPick={handlePick} />}
    </div>
  )
}
```

- [ ] **Step 4: Add snippet props and `useEffect` to `QueryEditor.tsx`**

Update `QueryEditorProps` interface (line 7-15) to add two optional props:

```ts
interface QueryEditorProps {
  value: string
  onChange: (value: string) => void
  dialect: Dialect
  placeholder?: string
  className?: string
  style?: CSSProperties
  highlightClause?: string
  pendingSnippet?: string | null
  clearPendingSnippet?: () => void
}
```

Destructure new props in function signature:

```tsx
export function QueryEditor({ value, onChange, dialect, placeholder, className, style, highlightClause, pendingSnippet, clearPendingSnippet }: QueryEditorProps) {
```

Add the snippet insertion effect (after the scroll-to-clause effect from Task 3):

```tsx
useEffect(() => {
  if (!pendingSnippet || !textareaRef.current) return
  const textarea = textareaRef.current
  if (!value.trim()) {
    onChange(pendingSnippet)
  } else {
    const start = textarea.selectionStart
    const next = value.substring(0, start) + '\n' + pendingSnippet + value.substring(start)
    onChange(next)
    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 1 + pendingSnippet.length
    })
  }
  clearPendingSnippet?.()
}, [pendingSnippet])
```

Note: `pendingSnippet` is the only dep — intentional, to avoid firing on every `value`/`onChange` change.

- [ ] **Step 5: Wire SnippetPicker and store fields in `AppShell.tsx`**

Add import:
```tsx
import { SnippetPicker } from '@/components/editor/SnippetPicker'
```

Add store subscriptions after the existing store calls (around line 22-30):
```tsx
const pendingSnippet      = useAppStore(s => s.pendingSnippet)
const clearPendingSnippet = useAppStore(s => s.clearPendingSnippet)
```

In `explainContent`, find the editor toolbar div (line 223-226):
```tsx
<div style={{ display: 'flex', gap: 6 }}>
  <CollectionPicker />
  <ExamplePicker />
</div>
```

Replace with:
```tsx
<div style={{ display: 'flex', gap: 6 }}>
  <CollectionPicker />
  <SnippetPicker />
  <ExamplePicker />
</div>
```

Find the main QueryEditor in `explainContent` (line 228):
```tsx
<QueryEditor value={query} onChange={setQuery} dialect={dialect} style={{ flex: 1 }} highlightClause={highlightClause} />
```

Replace with:
```tsx
<QueryEditor
  value={query} onChange={setQuery} dialect={dialect}
  style={{ flex: 1 }} highlightClause={highlightClause}
  pendingSnippet={pendingSnippet} clearPendingSnippet={clearPendingSnippet}
/>
```

- [ ] **Step 6: Write the SnippetPicker test**

```tsx
// src/__tests__/components/SnippetPicker.spec.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SnippetPicker } from '@/components/editor/SnippetPicker'

const mockSetPendingSnippet = vi.fn()

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (sel: (s: object) => unknown) =>
    sel({ setPendingSnippet: mockSetPendingSnippet }),
}))

vi.mock('@/lib/snippets', () => ({
  SNIPPETS: [
    { id: 'a', title: 'SELECT JOIN', description: 'Inner join', sql: 'SELECT 1' },
    { id: 'b', title: 'CTE', description: 'Common table expr', sql: 'WITH cte AS (SELECT 1) SELECT * FROM cte' },
  ],
}))

beforeEach(() => vi.clearAllMocks())

describe('SnippetPicker', () => {
  it('renders Snippets button', () => {
    render(<SnippetPicker />)
    expect(screen.getByRole('button', { name: /insert a sql snippet/i })).toBeTruthy()
  })

  it('opens dropdown on click', () => {
    render(<SnippetPicker />)
    fireEvent.click(screen.getByRole('button', { name: /insert a sql snippet/i }))
    expect(screen.getByText('SELECT JOIN')).toBeTruthy()
    expect(screen.getByText('CTE')).toBeTruthy()
  })

  it('calls setPendingSnippet when a snippet is picked', () => {
    render(<SnippetPicker />)
    fireEvent.click(screen.getByRole('button', { name: /insert a sql snippet/i }))
    fireEvent.click(screen.getByText('SELECT JOIN'))
    expect(mockSetPendingSnippet).toHaveBeenCalledWith('SELECT 1')
  })

  it('closes dropdown after picking a snippet', () => {
    render(<SnippetPicker />)
    fireEvent.click(screen.getByRole('button', { name: /insert a sql snippet/i }))
    fireEvent.click(screen.getByText('SELECT JOIN'))
    expect(screen.queryByText('CTE')).toBeNull()
  })
})
```

- [ ] **Step 7: Run tests**

```
npm run test -- src/__tests__/components/SnippetPicker.spec.tsx
```

Expected: all 4 pass.

- [ ] **Step 8: Run full suite**

```
npm run test
```

Expected: 601+ passing, 0 failing.

- [ ] **Step 9: Commit**

```
git add src/lib/snippets.ts \
        src/store/useAppStore.ts \
        src/components/editor/SnippetPicker.tsx \
        src/components/editor/QueryEditor.tsx \
        src/components/layout/AppShell.tsx \
        src/__tests__/components/SnippetPicker.spec.tsx
git commit -m "feat(editor): add SQL snippet picker with replace/insert-at-cursor behavior"
```

---

## Task 5: Inline error markers — highlight problem lines in the editor

**Files:**
- Modify: `src/types/index.ts` — add `line?: number` to `Issue`
- Modify: `src/lib/analyzers/locks.ts` — add line detection to NOLOCK/HOLDLOCK patterns
- Modify: `src/components/editor/QueryEditor.tsx` — `ErrorLineOverlay` component + `issues` prop + overlay ref
- Modify: `src/components/layout/AppShell.tsx` — pass `issues` to main `QueryEditor`

- [ ] **Step 1: Add `line?: number` to `Issue` in `src/types/index.ts`**

Find the `Issue` interface (line 50-59) and add `line?: number`:

```ts
export interface Issue {
  id: string
  severity: IssueSeverity
  title: string
  description: string
  suggestion: string
  nodeId?: string
  dialectNote?: string
  docUrl?: string
  line?: number
}
```

- [ ] **Step 2: Add line detection to `detectLocks` in `src/lib/analyzers/locks.ts`**

Replace the current `if (/regex/)` checks with `exec()` to get match index, then compute line number:

```ts
import type { Issue, Dialect } from '@/types'

let _counter = 0

export function detectLocks(sql: string, dialect: Dialect): Issue[] {
  _counter = 0
  if (dialect !== 'sqlserver') return []
  const issues: Issue[] = []

  const nolockMatch = /WITH\s*\(\s*NOLOCK\s*\)/i.exec(sql)
  if (nolockMatch) {
    issues.push({
      id: `lock-${_counter++}`,
      severity: 'info',
      title: 'NOLOCK hint detected',
      description: 'WITH (NOLOCK) allows dirty reads — uncommitted data that may be rolled back.',
      suggestion: 'Use NOLOCK only for reporting queries where stale data is acceptable. Avoid in transactional contexts.',
      dialectNote: 'SQL Server only',
      line: sql.substring(0, nolockMatch.index).split('\n').length,
    })
  }

  const holdlockMatch = /WITH\s*\(\s*HOLDLOCK\s*\)/i.exec(sql)
  if (holdlockMatch) {
    issues.push({
      id: `lock-${_counter++}`,
      severity: 'warning',
      title: 'HOLDLOCK hint detected',
      description: 'WITH (HOLDLOCK) holds shared locks until transaction end and can cause deadlocks.',
      suggestion: 'Ensure HOLDLOCK is intentional and that transactions are kept short to minimize deadlock risk.',
      dialectNote: 'SQL Server only',
      line: sql.substring(0, holdlockMatch.index).split('\n').length,
    })
  }

  return issues
}
```

- [ ] **Step 3: Add `ErrorLineOverlay` and `issues` prop to `QueryEditor.tsx`**

Add `Issue` import to the existing imports:
```tsx
import type { Dialect, Issue } from '@/types'
```

Add `overlayRef` alongside the existing refs:
```tsx
const overlayRef  = useRef<HTMLDivElement>(null)
```

Add `LINE_H` and `PAD_TOP` constants near `SHARED`:
```ts
const LINE_H = 13 * 1.6  // lineHeight matching SHARED styles
const PAD_TOP = 12        // padding matching SHARED styles
```

Add `ErrorLineOverlay` component before `QueryEditor` function:
```tsx
function ErrorLineOverlay({ issues }: { issues: Issue[] }) {
  const errorLines = issues.filter(i => i.line != null && i.severity === 'error').map(i => i.line!)
  const warnLines  = issues.filter(i => i.line != null && i.severity !== 'error').map(i => i.line!)

  return (
    <>
      {errorLines.map(line => (
        <div key={`err-${line}`} style={{
          position: 'absolute', left: 0, right: 0,
          top: PAD_TOP + (line - 1) * LINE_H, height: LINE_H,
          background: 'rgba(226,75,74,0.10)',
          borderLeft: '2px solid #E24B4A',
          pointerEvents: 'none',
        }} />
      ))}
      {warnLines.map(line => (
        <div key={`warn-${line}`} style={{
          position: 'absolute', left: 0, right: 0,
          top: PAD_TOP + (line - 1) * LINE_H, height: LINE_H,
          background: 'rgba(239,159,39,0.08)',
          borderLeft: '2px solid #EF9F27',
          pointerEvents: 'none',
        }} />
      ))}
    </>
  )
}
```

Add `issues` to `QueryEditorProps`:
```ts
interface QueryEditorProps {
  value: string
  onChange: (value: string) => void
  dialect: Dialect
  placeholder?: string
  className?: string
  style?: CSSProperties
  highlightClause?: string
  pendingSnippet?: string | null
  clearPendingSnippet?: () => void
  issues?: Issue[]
}
```

Update function signature to destructure `issues`:
```tsx
export function QueryEditor({ value, onChange, dialect, placeholder, className, style, highlightClause, pendingSnippet, clearPendingSnippet, issues }: QueryEditorProps) {
```

Update `syncScroll` to also translate the overlay:
```tsx
const syncScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
  const st = e.currentTarget.scrollTop
  if (scrollRef.current) {
    scrollRef.current.scrollTop = st
    scrollRef.current.scrollLeft = e.currentTarget.scrollLeft
  }
  if (overlayRef.current) {
    overlayRef.current.style.transform = `translateY(${-st}px)`
  }
}, [])
```

Add the overlay div inside the returned JSX, BEFORE the `<pre>` backdrop (so it renders at zIndex 0 below the pre at zIndex 1):

```tsx
{/* Error/warning line overlay */}
{issues && issues.some(i => i.line != null) && (
  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
    <div ref={overlayRef} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
      <ErrorLineOverlay issues={issues} />
    </div>
  </div>
)}
```

- [ ] **Step 4: Pass `issues` to the main QueryEditor in `AppShell.tsx`**

The main QueryEditor in `explainContent` (the one in the left panel, updated in Task 4) should now also receive `issues`:

```tsx
<QueryEditor
  value={query} onChange={setQuery} dialect={dialect}
  style={{ flex: 1 }} highlightClause={highlightClause}
  pendingSnippet={pendingSnippet} clearPendingSnippet={clearPendingSnippet}
  issues={issues}
/>
```

(The `issues` variable is already in scope at line 28: `const issues = useAppStore(s => s.issues)`)

- [ ] **Step 5: Run TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Run full suite**

```
npm run test
```

Expected: 601+ tests passing, 0 failing.

- [ ] **Step 7: Commit**

```
git add src/types/index.ts \
        src/lib/analyzers/locks.ts \
        src/components/editor/QueryEditor.tsx \
        src/components/layout/AppShell.tsx
git commit -m "feat(editor): add inline error/warning line markers in SQL editor"
```

---

## Final: TypeScript + full suite verification

- [ ] **Run TypeScript**

```
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Run full test suite**

```
npm run test
```

Expected: all passing.
