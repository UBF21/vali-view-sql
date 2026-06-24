# Editor & Diagram v2 — Design Spec

**Fecha:** 2026-06-24
**Proyecto:** vali-viewsql

---

## Sub-proyecto 1: Diagram Intelligence

### 1A — Edge labels en JOIN (ON condition)

**Decisión:** C — siempre visible `ON ···` en el edge, hover muestra el ON condition completo.

**Arquitectura:**
- Nuevo custom edge type `'labeled-join'` → componente `LabeledJoinEdge.tsx`
- `LabeledJoinEdge` usa `getBezierPath` + `EdgeLabelRenderer` de `@xyflow/react`
- El pill `ON ···` siempre visible en el centro del edge; al hover, tooltip con el `onCondition` completo
- `makeJoinEdge` en `ast-to-graph.ts` recibe param `onCondition` (solo se pasa en el edge `joinedTableId → joinId`, no en los edges de las fuentes izquierdas)
- DiagramCanvas registra `edgeTypes = { 'labeled-join': LabeledJoinEdge }` en el `<ReactFlow>`

**Archivos:**
- `src/components/diagram/edges/LabeledJoinEdge.tsx` (nuevo)
- `src/lib/parser/ast-to-graph.ts` (modificar `makeJoinEdge`)
- `src/components/diagram/DiagramCanvas.tsx` (registrar `edgeTypes`)

### 1B — Zoom controls integrados con ExportButton

**Decisión:** Botones +/−/Fit con el mismo estilo visual que ExportButton, en la esquina inferior-derecha del canvas, a la izquierda del grupo de export. Se elimina el `<Controls />` nativo de ReactFlow.

**Arquitectura:**
- `useReactFlow()` solo funciona dentro del contexto ReactFlow → se registran las funciones en Zustand desde `FlowCanvas` al montar
- Store: campo `zoomControls: { zoomIn, zoomOut, fitView } | null` + `setZoomControls`
- `ZoomButtons.tsx`: nuevo componente que lee del store, renderiza `[+] [−] [⊡]`
- AppShell: reemplaza el overlay de `<ExportButton />` con `<div flex-row><ZoomButtons /><ExportButton /></div>`
- Se elimina `<Controls />` de `FlowCanvas`

**Archivos:**
- `src/store/useAppStore.ts` (agregar zoomControls)
- `src/components/diagram/DiagramCanvas.tsx` (setZoomControls + remover Controls)
- `src/components/diagram/ZoomButtons.tsx` (nuevo)
- `src/components/layout/AppShell.tsx` (render ZoomButtons + ExportButton juntos)

---

## Sub-proyecto 2: Editor Quick Wins

### 2A — Scroll-to-clause

**Problema:** Cuando el usuario clickea un nodo en el diagrama, `highlightClause` actualiza el backdrop highlight pero el `<textarea>` no hace scroll hasta la línea visible.

**Solución:** `useEffect` en `QueryEditor` que reacciona al cambio de `highlightClause`: computa el offset de caracteres del clause en el valor, convierte a número de línea, y setea `textarea.scrollTop`.

- `lineHeight = fontSize(13) * lineHeight(1.6) = 20.8px`
- `paddingTop = 12px`
- `scrollTop = Math.max(0, (linesBefore * lineHeight) - clientHeight / 3)` (centra verticalmente)
- Sincroniza también `scrollRef.current.scrollTop` para mantener el backdrop alineado

**Archivos:** `src/components/editor/QueryEditor.tsx`

### 2B — Snippets / Templates

**Decisión:** C — reemplaza si el editor está vacío, inserta en cursor si tiene contenido.

**Arquitectura:**
- `src/lib/snippets.ts`: array `SNIPPETS` con 5 templates: SELECT+JOIN, CTE, Subquery, Window function, GROUP BY
- `src/store/useAppStore.ts`: `pendingSnippet: string | null` + `setPendingSnippet` + `clearPendingSnippet`
- `SnippetPicker.tsx`: dropdown similar a ExamplePicker, llama `setPendingSnippet(snippet.sql)`
- `QueryEditor.tsx`: `useEffect` que observa `pendingSnippet`. Si `value.trim() === ''` → `onChange(snippet)`. Si tiene contenido → inserta en `selectionStart` con `\n` antes, ajusta cursor. Llama `clearPendingSnippet()`.
- AppShell: agrega `<SnippetPicker />` junto a `<ExamplePicker />` en la toolbar del editor

**Archivos:**
- `src/lib/snippets.ts` (nuevo)
- `src/store/useAppStore.ts` (agregar pendingSnippet)
- `src/components/editor/SnippetPicker.tsx` (nuevo)
- `src/components/editor/QueryEditor.tsx` (useEffect + prop pendingSnippet/clearPendingSnippet)
- `src/components/layout/AppShell.tsx` (render SnippetPicker)

### 2C — Marcadores inline de errores

**Arquitectura:** Overlay absoluto dentro del editor container (detrás del backdrop `<pre>`) que renderiza filas de color por cada línea con issue. Scroll sincronizado via `translateY`.

- `Issue` type: agregar `line?: number` (campo opcional, no breaking)
- `detectLocks` en `locks.ts`: agrega detección de línea via `sql.substring(0, match.index).split('\n').length`
- `QueryEditor`: acepta prop `issues?: Issue[]`. Renderiza `<ErrorLineOverlay>` sub-componente con `position: absolute, inset: 0, zIndex: 0, pointerEvents: none`. Sincroniza scroll via el `scrollTop` state que ya existe en `syncScroll`.
- Estilos: línea error = `background: rgba(226,75,74,0.08)` + `borderLeft: 2px solid #E24B4A`. Warning = ámbar.
- AppShell: pasa `issues={issues}` a `QueryEditor`

**Archivos:**
- `src/types/index.ts` (agregar `line?: number` a Issue)
- `src/lib/analyzers/locks.ts` (detectar línea en patterns encontrados)
- `src/components/editor/QueryEditor.tsx` (ErrorLineOverlay + prop issues + scroll sync)
- `src/index.css` (clases de overlay si se necesitan)

---

## Criterios de aceptación

- TypeScript clean
- Suite de tests pasa (`npm run test`)
- Edge labels visibles en queries con JOIN — sin distorsión visual en queries simples (sin JOIN → sin cambio)
- ZoomButtons renders correctamente después de que el canvas monta (no antes)
- Scroll-to-clause centra la línea objetivo en el viewport del editor
- Snippets: replace funciona en editor vacío, insert-at-cursor funciona en editor con contenido
- Líneas con issues resaltan en rojo/ámbar; lines sin issues no se afectan
