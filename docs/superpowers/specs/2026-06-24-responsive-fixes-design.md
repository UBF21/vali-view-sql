# Responsive Fixes — Design Spec

**Fecha:** 2026-06-24
**Proyecto:** vali-viewsql
**Alcance:** Fix B — todos los breakpoints ≥320px

---

## Contexto

El app ya tiene estructura responsive sólida: hook `useIsMobile()` a 768px, drawers en tablet (769-1024px), layouts mobile completos (`MobileSwipeLayout`, `MobileBottomSheet`, `MobileDiffLayout`, `MobileExplainLayout`, `MobileStepperLayout`). Los problemas reales son overlays flotantes y dropdowns que no defienden sus bordes contra el viewport.

**Breakpoints activos:**
- `>1024px` — desktop: 3 columnas con paneles laterales
- `769-1024px` — tablet: drawers + FABs, `isMobile = false`
- `≤768px` — mobile: `isMobile = true`, layouts React dedicados
- `≤340px` — tiny: nota de orientación

---

## Fix 1 — ConversionModal width responsive

**Archivo:** `src/components/editor/ConversionModal.tsx`

**Problema:** `width: 560` sin fallback. En 375px (iPhone SE) ocupa el viewport entero y el `transform: translate(-50%, -50%)` lo corta en los bordes.

**Fix:**
```tsx
// antes
width: 560, maxHeight: '80vh'

// después
width: 'min(560px, 95vw)', maxHeight: 'min(80vh, calc(100dvh - 32px))'
```

`min()` es CSS nativo — en desktop queda en 560px, en mobile usa el 95% del viewport. `100dvh` (dynamic viewport height) evita el issue de la barra de dirección en iOS Safari.

---

## Fix 2 — NodeInfoPanel width responsive

**Archivo:** `src/components/diagram/NodeInfoPanel.tsx`

**Problema:** `width: 340, position: fixed, right: 0`. En 375px deja 35px de pantalla visible al clicar un nodo del diagrama (el panel también aparece en `MobileExplainLayout`).

**Fix (línea ~138):**
```tsx
// antes
width: 340, position: 'fixed', right: 0, top: 48

// después
width: 'min(340px, 100vw)', position: 'fixed', right: 0, top: 48
```

El panel ya tiene `overflowY: 'auto'` — agregar `overflowX: 'hidden'` en el contenedor interno para evitar scroll horizontal.

---

## Fix 3 — Utility compartida: computeDropdownRect

**Archivo nuevo:** `src/lib/responsive/dropdown-rect.ts`

Los 3 pickers (Collection, Example, Snippet) comparten el mismo patrón de bug: usan `left: rect.left` y `width: Npx` fijos, sin verificar si el dropdown cabe horizontalmente. Además, `maxHeight` fijo no respeta la altura disponible real (en pantallas cortas el menú sale por abajo).

**Implementación:**
```ts
export interface DropdownRect {
  top: number
  left: number
  width: number
  maxHeight: number
}

export function computeDropdownRect(
  buttonRect: DOMRect,
  menuWidth: number,
  menuMaxHeight: number,
): DropdownRect {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const w = Math.min(menuWidth, vw - 16)
  const left = Math.min(buttonRect.left, vw - w - 8)
  const maxHeight = Math.min(menuMaxHeight, vh - buttonRect.bottom - 12)
  return { top: buttonRect.bottom + 4, left, width: w, maxHeight }
}
```

**Parámetros por picker:**

| Picker | menuWidth | menuMaxHeight |
|--------|-----------|---------------|
| CollectionPicker | 320 | 400 |
| ExamplePicker | 300 | 380 |
| SnippetPicker | 260 | 340 |

---

## Fix 4 — CollectionPicker viewport-aware

**Archivo:** `src/components/editor/CollectionPicker.tsx`

Reemplazar el cálculo inline de posición del dropdown por `computeDropdownRect`:

```tsx
// antes (en el handler de apertura)
setPos({ top: rect.bottom + 4, left: rect.left })
// y en el div del dropdown:
position: 'fixed', top: pos.top, left: pos.left, width: 320, maxHeight: 400

// después
import { computeDropdownRect } from '@/lib/responsive/dropdown-rect'

const dr = computeDropdownRect(rect, 320, 400)
setPos(dr)
// y en el div del dropdown:
position: 'fixed', top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight
```

El tipo del estado cambia de `{ top: number; left: number }` a `DropdownRect | null`.

---

## Fix 5 — ExamplePicker viewport-aware

**Archivo:** `src/components/editor/ExamplePicker.tsx`

Mismo patrón que Fix 4:

```tsx
// antes
setPos({ top: r.bottom + 4, left: r.left })
// div: width: 300, maxHeight: 380

// después
const dr = computeDropdownRect(r, 300, 380)
setPos(dr)
// div: width: pos.width, maxHeight: pos.maxHeight
```

---

## Fix 6 — SnippetPicker viewport-aware

**Archivo:** `src/components/editor/SnippetPicker.tsx`

Mismo patrón:

```tsx
// antes
setPos({ top: r.bottom + 4, left: r.left })
// div: width: 260, maxHeight: 340

// después
const dr = computeDropdownRect(r, 260, 340)
setPos(dr)
// div: width: pos.width, maxHeight: pos.maxHeight
```

---

## Fix 7 — Stepper panel clamp()

**Archivo:** `src/components/layout/AppShell.tsx`

**Problema:** `width: 340, flexShrink: 0` en el panel izquierdo del stepper. En tablets de 769-900px (donde `isMobile = false`) el editor ocupa 340px fijos dejando poco espacio para el diagrama.

**Fix (línea ~152):**
```tsx
// antes
width: 340, flexShrink: 0

// después
width: 'clamp(220px, 35%, 340px)', flexShrink: 0
```

Comportamiento:
- 769px → 35% = 269px, diagrama tiene ~500px ✓
- 1024px → 35% = 358px → capped en 340px ✓
- Tablet angosto 640px (imposible hoy, pero defensivo) → 224px ✓

---

## Fuera de alcance

- **DiffContent:** No requiere cambios — `MobileDiffLayout` cubre ≤768px, side-by-side en 769px+ da ~384px por diagrama que es manejable en ReactFlow.
- **Rediseño tablet (768-1024px):** El sistema de drawers ya funciona en ese rango.
- **Nuevos breakpoints:** No se agregan — los 3 existentes + los layout React son suficientes.

---

## Criterios de aceptación

- ConversionModal no desborda en 375px ni en 320px
- NodeInfoPanel es completamente visible al clicar un nodo en 375px
- Todos los dropdowns (Collection, Example, Snippet) se ajustan al viewport en width y height
- Panel izquierdo del stepper no comprime el diagrama en tablets 769-900px
- Suite de tests pasa sin cambios adicionales (los fixes son visual/layout, sin lógica)
- No se rompe ningún comportamiento en desktop (≥1024px)
