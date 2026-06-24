# Responsive Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer que todos los overlays flotantes, dropdowns y paneles del app funcionen correctamente en viewports ≥320px sin desbordamiento ni elementos cortados.

**Architecture:** 7 fixes quirúrgicos: una utility pura `computeDropdownRect` para los 3 pickers, clamping con `min()`/`clamp()` para modales y paneles fijos, y tipado limpio con `DropdownRect` compartido entre los pickers.

**Tech Stack:** React 19, TypeScript strict, Vite, Vitest, inline styles (no Tailwind en componentes)

---

## Archivos a tocar

| Acción | Archivo | Qué cambia |
|--------|---------|------------|
| Crear | `src/lib/responsive/dropdown-rect.ts` | Utility `computeDropdownRect` + tipo `DropdownRect` |
| Crear | `src/lib/responsive/dropdown-rect.spec.ts` | Tests de la utility |
| Modificar | `src/components/editor/ConversionModal.tsx` | `width: 560` → `min(560px, 95vw)` |
| Modificar | `src/components/diagram/NodeInfoPanel.tsx` | `width: 340` → `min(340px, 100vw)` |
| Modificar | `src/components/layout/AppShell.tsx` | stepper panel `width: 340` → `clamp(220px, 35%, 340px)` |
| Modificar | `src/components/editor/CollectionPicker.tsx` | usar `computeDropdownRect` |
| Modificar | `src/components/editor/ExamplePicker.tsx` | usar `computeDropdownRect` |
| Modificar | `src/components/editor/SnippetPicker.tsx` | usar `computeDropdownRect` |

---

## Task 1: Utility computeDropdownRect + tests

**Files:**
- Create: `src/lib/responsive/dropdown-rect.ts`
- Create: `src/lib/responsive/dropdown-rect.spec.ts`

- [ ] **Step 1: Crear la utility**

```ts
// src/lib/responsive/dropdown-rect.ts

export interface DropdownRect {
  top: number
  left: number
  width: number
  maxHeight: number
}

/**
 * Calcula la posición y dimensiones de un dropdown flotante defendiendo
 * los bordes del viewport para no desbordarse en pantallas pequeñas.
 *
 * @param buttonRect  DOMRect del botón que abre el dropdown
 * @param menuWidth   Ancho deseado del dropdown (px)
 * @param menuMaxH    Altura máxima deseada del dropdown (px)
 */
export function computeDropdownRect(
  buttonRect: DOMRect,
  menuWidth: number,
  menuMaxH: number,
): DropdownRect {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const w = Math.min(menuWidth, vw - 16)
  const left = Math.min(buttonRect.left, vw - w - 8)
  const maxHeight = Math.min(menuMaxH, vh - buttonRect.bottom - 12)
  return { top: buttonRect.bottom + 4, left, width: w, maxHeight }
}
```

- [ ] **Step 2: Escribir los tests**

```ts
// src/lib/responsive/dropdown-rect.spec.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { computeDropdownRect } from './dropdown-rect'

function makeRect(overrides: Partial<DOMRect> = {}): DOMRect {
  return {
    top: 0, left: 0, bottom: 40, right: 100,
    width: 100, height: 40, x: 0, y: 0,
    toJSON: () => ({}),
    ...overrides,
  } as DOMRect
}

describe('computeDropdownRect', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { innerWidth: 1024, innerHeight: 768 })
  })
  afterEach(() => { vi.unstubAllGlobals() })

  it('retorna top = buttonRect.bottom + 4', () => {
    const r = computeDropdownRect(makeRect({ bottom: 50 }), 300, 400)
    expect(r.top).toBe(54)
  })

  it('usa el menuWidth cuando cabe en el viewport', () => {
    const r = computeDropdownRect(makeRect({ left: 100 }), 300, 400)
    expect(r.width).toBe(300)
  })

  it('recorta el ancho cuando menuWidth > viewport - 16', () => {
    vi.stubGlobal('window', { innerWidth: 320, innerHeight: 568 })
    const r = computeDropdownRect(makeRect({ left: 0 }), 400, 400)
    expect(r.width).toBe(304) // 320 - 16
  })

  it('usa left = buttonRect.left cuando cabe', () => {
    const r = computeDropdownRect(makeRect({ left: 100 }), 300, 400)
    expect(r.left).toBe(100)
  })

  it('clampea left para no salirse por la derecha', () => {
    vi.stubGlobal('window', { innerWidth: 375, innerHeight: 667 })
    // botón en x=200, menú de 260px → 200+260 = 460 > 375 → debe mover izq
    const r = computeDropdownRect(makeRect({ left: 200 }), 260, 400)
    expect(r.left).toBe(375 - 260 - 8) // = 107
  })

  it('recorta maxHeight para no salirse por abajo', () => {
    vi.stubGlobal('window', { innerWidth: 1024, innerHeight: 400 })
    // botón bottom=350 → espacio restante = 400-350-12 = 38
    const r = computeDropdownRect(makeRect({ bottom: 350 }), 300, 400)
    expect(r.maxHeight).toBe(38)
  })

  it('usa menuMaxH cuando hay espacio suficiente', () => {
    const r = computeDropdownRect(makeRect({ bottom: 40 }), 300, 380)
    expect(r.maxHeight).toBe(380) // 768-40-12 = 716 > 380
  })

  it('left mínimo 0 (no negativos)', () => {
    vi.stubGlobal('window', { innerWidth: 375, innerHeight: 667 })
    const r = computeDropdownRect(makeRect({ left: 2 }), 400, 400)
    expect(r.left).toBeGreaterThanOrEqual(0)
  })
})
```

- [ ] **Step 3: Ejecutar los tests**

```
npx vitest run src/lib/responsive/dropdown-rect.spec.ts
```

Expected: 8 tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/responsive/dropdown-rect.ts src/lib/responsive/dropdown-rect.spec.ts
git commit -m "feat(responsive): add computeDropdownRect viewport-safe utility"
```

---

## Task 2: ConversionModal — width responsive

**Files:**
- Modify: `src/components/editor/ConversionModal.tsx` (línea ~175 en `ModalPanel`)

El modal tiene `width: 560` sin límite de viewport. En un iPhone SE (375px) el modal sale cortado.

- [ ] **Step 1: Aplicar el fix**

En `src/components/editor/ConversionModal.tsx`, dentro del style del `<motion.div>` del `ModalPanel` (la línea que tiene `width: 560, maxHeight: '80vh'`), cambiar:

```tsx
// ANTES
width: 560, maxHeight: '80vh',

// DESPUÉS
width: 'min(560px, 95vw)', maxHeight: 'min(80vh, calc(100dvh - 32px))',
```

El objeto style completo del `<motion.div>` queda:
```tsx
style={{
  position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
  zIndex: 999, background: 'var(--surface)', border: '1px solid var(--border-hi)',
  borderRadius: 12, boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
  width: 'min(560px, 95vw)', maxHeight: 'min(80vh, calc(100dvh - 32px))',
  display: 'flex', flexDirection: 'column',
  outline: 'none',
}}
```

- [ ] **Step 2: Verificar que los tests existentes pasan**

```
npx vitest run src/__tests__/components/ConversionModal.spec.tsx
```

Expected: todos los tests PASS (el cambio es solo CSS)

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/ConversionModal.tsx
git commit -m "fix(responsive): clamp ConversionModal width to 95vw on narrow screens"
```

---

## Task 3: NodeInfoPanel — width responsive

**Files:**
- Modify: `src/components/diagram/NodeInfoPanel.tsx` (línea ~138)

El panel info tiene `width: 340` fijo. En 375px cubre casi toda la pantalla. En 320px desborda.

- [ ] **Step 1: Aplicar el fix**

En `src/components/diagram/NodeInfoPanel.tsx`, dentro del `style` del `<motion.div>` principal (el que tiene `position: 'fixed', top: 48, right: 0, bottom: 0, width: 340`), cambiar:

```tsx
// ANTES
width: 340,

// DESPUÉS
width: 'min(340px, 100vw)',
```

El objeto style completo:
```tsx
style={{
  position: 'fixed',
  top: 48,
  right: 0,
  bottom: 0,
  width: 'min(340px, 100vw)',
  background: 'var(--surface)',
  borderLeft: '1px solid var(--border-hi)',
  zIndex: 50,
  overflowY: 'auto',
  overflowX: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '-8px 0 32px rgba(0,0,0,0.25)',
}}
```

(Se agrega `overflowX: 'hidden'` — el panel ya tiene `overflowY: 'auto'` pero no tenía overflow-x.)

- [ ] **Step 2: Verificar build limpio**

```
npx tsc --noEmit
```

Expected: sin errores TypeScript nuevos (puede haber errores pre-existentes en otros archivos, ignorarlos).

- [ ] **Step 3: Commit**

```bash
git add src/components/diagram/NodeInfoPanel.tsx
git commit -m "fix(responsive): clamp NodeInfoPanel width to 100vw on narrow screens"
```

---

## Task 4: AppShell — stepper panel clamp()

**Files:**
- Modify: `src/components/layout/AppShell.tsx` (línea ~152)

El panel izquierdo del stepper tiene `width: 340, flexShrink: 0`. En tablets 769-900px (donde `isMobile=false`) comprime el diagrama.

- [ ] **Step 1: Aplicar el fix**

En `src/components/layout/AppShell.tsx`, en el `<div>` del panel editor del stepper (línea ~151-154), cambiar:

```tsx
// ANTES
<div style={{
  width: 340, flexShrink: 0, borderRight: '1px solid var(--border)',
  padding: 12, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden',
}}>

// DESPUÉS
<div style={{
  width: 'clamp(220px, 35%, 340px)', flexShrink: 0, borderRight: '1px solid var(--border)',
  padding: 12, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden',
}}>
```

- [ ] **Step 2: Verificar build**

```
npx tsc --noEmit
```

Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/AppShell.tsx
git commit -m "fix(responsive): stepper editor panel uses clamp(220px, 35%, 340px)"
```

---

## Task 5: CollectionPicker — viewport-aware

**Files:**
- Modify: `src/components/editor/CollectionPicker.tsx`

El estado actual guarda `rect: DOMRect | null`. La posición del dropdown se computa inline en JSX usando `rect.bottom` y `rect.left` directamente, con `width: 320, maxHeight: 400` fijos.

**Estrategia:** cambiar el estado a `pos: DropdownRect | null` y computar con `computeDropdownRect` en el handler.

- [ ] **Step 1: Aplicar el fix**

Reemplazar el contenido completo de `src/components/editor/CollectionPicker.tsx`:

En las importaciones, agregar al inicio del archivo:
```tsx
import { computeDropdownRect, type DropdownRect } from '@/lib/responsive/dropdown-rect'
```

En `usePickerState()`:
```tsx
// ANTES
const [rect, setRect] = useState<DOMRect | null>(null)

const toggle = useCallback(() => {
  if (!open && btnRef.current) setRect(btnRef.current.getBoundingClientRect())
  setOpen(v => !v)
}, [open])

// ...return
return { open, setOpen, showSave, setShowSave, search, setSearch, rect, btnRef, toggle }

// DESPUÉS
const [pos, setPos] = useState<DropdownRect | null>(null)

const toggle = useCallback(() => {
  if (!open && btnRef.current) {
    setPos(computeDropdownRect(btnRef.current.getBoundingClientRect(), 320, 400))
  }
  setOpen(v => !v)
}, [open])

// ...return
return { open, setOpen, showSave, setShowSave, search, setSearch, pos, btnRef, toggle }
```

En `CollectionPicker` (la función principal), destructurar `pos` en lugar de `rect`:
```tsx
const { open, setOpen, showSave, setShowSave, search, setSearch, pos, btnRef, toggle } = usePickerState()
```

En el JSX del dropdown (línea ~169):
```tsx
// ANTES
{open && rect && createPortal(
  <div style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: 320, maxHeight: 400, background: 'var(--surface)', border: '1px solid var(--border-hi)', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.28)', zIndex: 9999, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

// DESPUÉS
{open && pos && createPortal(
  <div style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight, background: 'var(--surface)', border: '1px solid var(--border-hi)', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.28)', zIndex: 9999, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
```

- [ ] **Step 2: Verificar tests existentes**

```
npx vitest run
```

Expected: todos los tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/CollectionPicker.tsx
git commit -m "fix(responsive): CollectionPicker dropdown respeta bordes del viewport"
```

---

## Task 6: ExamplePicker — viewport-aware

**Files:**
- Modify: `src/components/editor/ExamplePicker.tsx`

El estado actual: `const [pos, setPos] = useState({ top: 0, left: 0 })`. El `Dropdown` recibe `pos: { top: number; left: number }` y tiene `width: 300, maxHeight: 380` hardcodeados.

- [ ] **Step 1: Aplicar el fix**

Agregar import al inicio del archivo:
```tsx
import { computeDropdownRect, type DropdownRect } from '@/lib/responsive/dropdown-rect'
```

Cambiar el tipo del estado en `ExamplePicker`:
```tsx
// ANTES
const [pos, setPos] = useState({ top: 0, left: 0 })

// DESPUÉS
const [pos, setPos] = useState<DropdownRect>({ top: 0, left: 0, width: 300, maxHeight: 380 })
```

Cambiar el handler `handleOpen`:
```tsx
// ANTES
const handleOpen = () => {
  if (btnRef.current) {
    const r = btnRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 4, left: r.left })
  }
  setOpen(v => !v)
}

// DESPUÉS
const handleOpen = () => {
  if (btnRef.current) {
    setPos(computeDropdownRect(btnRef.current.getBoundingClientRect(), 300, 380))
  }
  setOpen(v => !v)
}
```

Cambiar la firma y el body del componente `Dropdown`:
```tsx
// ANTES
function Dropdown({ pos, dialect, onPick }: { pos: { top: number; left: number }; dialect: Dialect; onPick: (sql: string) => void }) {
  return (
    <div style={{
      position: 'fixed', top: pos.top, left: pos.left, width: 300, maxHeight: 380,
      overflowY: 'auto', background: 'var(--surface, var(--bg-surface))',
      border: '1px solid var(--border)', borderRadius: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,.5)', zIndex: 9999,
    }}>

// DESPUÉS
function Dropdown({ pos, dialect, onPick }: { pos: DropdownRect; dialect: Dialect; onPick: (sql: string) => void }) {
  return (
    <div style={{
      position: 'fixed', top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight,
      overflowY: 'auto', background: 'var(--surface, var(--bg-surface))',
      border: '1px solid var(--border)', borderRadius: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,.5)', zIndex: 9999,
    }}>
```

- [ ] **Step 2: Verificar tests**

```
npx vitest run
```

Expected: todos los tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/ExamplePicker.tsx
git commit -m "fix(responsive): ExamplePicker dropdown respeta bordes del viewport"
```

---

## Task 7: SnippetPicker — viewport-aware

**Files:**
- Modify: `src/components/editor/SnippetPicker.tsx`

El estado está en `useSnippetPicker()`: `const [pos, setPos] = useState({ top: 0, left: 0 })`. El `Dropdown` tiene `width: 260, maxHeight: 340` hardcodeados.

- [ ] **Step 1: Aplicar el fix**

Agregar import al inicio del archivo:
```tsx
import { computeDropdownRect, type DropdownRect } from '@/lib/responsive/dropdown-rect'
```

En `useSnippetPicker()`, cambiar el estado y el handler:
```tsx
// ANTES
const [pos, setPos] = useState({ top: 0, left: 0 })

const handleOpen = useCallback(() => {
  if (btnRef.current) {
    const r = btnRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 4, left: r.left })
  }
  setOpen(v => !v)
}, [])

// DESPUÉS
const [pos, setPos] = useState<DropdownRect>({ top: 0, left: 0, width: 260, maxHeight: 340 })

const handleOpen = useCallback(() => {
  if (btnRef.current) {
    setPos(computeDropdownRect(btnRef.current.getBoundingClientRect(), 260, 340))
  }
  setOpen(v => !v)
}, [])
```

Cambiar la firma y body de `Dropdown`:
```tsx
// ANTES
function Dropdown({ pos, onPick }: { pos: { top: number; left: number }; onPick: (sql: string) => void }) {
  return (
    <div style={{
      position: 'fixed', top: pos.top, left: pos.left, width: 260, maxHeight: 340,
      overflowY: 'auto', background: 'var(--surface)',
      border: '1px solid var(--border)', borderRadius: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,.5)', zIndex: 9999,
    }}>

// DESPUÉS
function Dropdown({ pos, onPick }: { pos: DropdownRect; onPick: (sql: string) => void }) {
  return (
    <div style={{
      position: 'fixed', top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight,
      overflowY: 'auto', background: 'var(--surface)',
      border: '1px solid var(--border)', borderRadius: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,.5)', zIndex: 9999,
    }}>
```

- [ ] **Step 2: Verificar suite completa**

```
npx vitest run
```

Expected: todos los tests PASS (el último "edge" a verificar es la utility spec de Task 1).

- [ ] **Step 3: Commit final**

```bash
git add src/components/editor/SnippetPicker.tsx
git commit -m "fix(responsive): SnippetPicker dropdown respeta bordes del viewport"
```

---

## Self-Review

**Spec coverage:**
- ✅ Fix 1 ConversionModal → Task 2
- ✅ Fix 2 NodeInfoPanel → Task 3
- ✅ Fix 3 utility computeDropdownRect → Task 1
- ✅ Fix 4 CollectionPicker → Task 5
- ✅ Fix 5 ExamplePicker → Task 6
- ✅ Fix 6 SnippetPicker → Task 7
- ✅ Fix 7 Stepper clamp → Task 4
- ✅ DiffContent — spec dice "no requiere cambios", confirmado fuera de scope

**Type consistency:**
- `DropdownRect` definido en Task 1, importado en Tasks 5, 6, 7 consistentemente
- `computeDropdownRect` exportada en Task 1, usada en Tasks 5, 6, 7 con misma firma

**No placeholders:** todos los pasos tienen código completo y comandos exactos.
