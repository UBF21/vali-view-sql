# UX Polish — Design Spec

**Fecha:** 2026-06-23  
**Proyecto:** vali-viewsql  
**Origen:** Audit exhaustivo de 34 problemas UI/UX post-Tier 3

---

## Alcance

7 áreas de mejora identificadas en audit. Cada una es independiente (sin solapamiento de archivos). Se priorizan por impacto real al usuario.

---

## Feature 1 — Canvas Loading State (Crítico)

**Problema:** Cuando el usuario escribe una query, el canvas queda completamente en blanco mientras parsea. `isLoading=true` pero nada lo indica visualmente.

**Solución:** Cuando `isLoading && nodes.length === 0`, mostrar un spinner (Lucide `Loader2`) en lugar del estado vacío. El estado vacío "Type a SQL query..." solo aparece cuando `!isLoading && nodes.length === 0`.

**Archivos:** `AppShell.tsx`, `index.css`

---

## Feature 2 — Export UX: Guards + Feedback (Alto)

**Problemas:**
- Exportar con el canvas vacío descarga un PNG/SVG en blanco sin feedback
- Los errores de export se tragan silenciosamente (catch sin user feedback)
- El estado "exportando" muestra "..." — poco descriptivo
- El título del botón Report dice "HTML → PDF" pero abre HTML en nueva pestaña

**Solución:**
- Deshabilitar botones PNG/SVG cuando `nodes.length === 0`, mostrar tooltip explicativo
- Hacer que `exportPNG` y `exportSVG` lancen errores en lugar de tragarlos
- `ExportButton` captura el error y muestra un mensaje inline temporal (3s)
- Mostrar "Exporting..." en lugar de "..." cuando está activo
- Cambiar título del botón Report a "Open analysis report in new tab"

**Archivos:** `useExport.ts`, `ExportButton.tsx`

---

## Feature 3 — ConversionModal: Focus + Aria (Medio)

**Problemas:**
- Al abrir el modal, el foco no se mueve automáticamente → usuario tiene que clickear
- El botón "Copy" cambia texto a "Copied!" pero screen readers no lo anuncian

**Solución:**
- `ModalPanel`: enfocar el modal container `(tabIndex={-1})` al montar con `useEffect`
- Botón Copy: envolver texto en `<span role="status" aria-live="polite">`

**Archivos:** `ConversionModal.tsx`

---

## Feature 4 — Collections UX (Alto)

**Problemas:**
- Eliminar colección sin confirmación → pérdida accidental de queries guardadas
- Crear colección nueva no la auto-selecciona en el select del formulario
- Placeholder de Tags no deja claro que son comma-separated
- Empty state ambiguo cuando no hay colecciones vs. cuando hay colecciones sin queries

**Solución:**
- `CollectionHeader.handleDelete`: `window.confirm()` antes de llamar `onDelete`
- `handleCreateCollection` en `useSaveQueryForm`: después de `addCollection()`, leer `useAppStore.getState().collections[0]?.id` y llamar `setColId(newId)`
- Tag placeholder: `"tag1, tag2, tag3"` en lugar de `"reporting, slow, draft"`
- `DropdownList`: recibir `hasCollections` prop y mostrar mensajes diferenciados

**Archivos:** `CollectionPicker.tsx`, `SaveQueryForm.tsx`

---

## Feature 5 — Suggestions + Schema Panels (Alto)

**Problemas:**
- Apply button completamente oculto cuando `!canRewrite(id)` → usuario no sabe que existe la función
- "Clear Schema" no tiene confirmación → pérdida accidental de schema DDL cargado

**Solución:**
- `ApplyButton`: siempre visible. Cuando `!canRewrite`, mostrar deshabilitado (`opacity: 0.6, cursor: not-allowed`) con `title="Auto-apply not available for this suggestion"`
- `SchemaLoaded.handleClear`: `window.confirm()` antes de `clearSchema()`

**Archivos:** `SuggestionsPanel.tsx`, `SchemaPanel.tsx`

---

## Feature 6 — Accessibility Quick Wins (Medio)

**Problemas:**
- Badges de Issues/Suggestions en PanelRight no tienen `aria-label` → screen reader dice el número sin contexto
- ComplexityBadge breakdown no cierra con Escape
- Toast "Link copied" no tiene `aria-live` → screen readers no lo anuncian
- ConvertButton en DialectSelector se puede abrir sin tener una query → modal vacío
- `DROPDOWN_H = 244` hardcodeado → si se agrega un 5° dialecto la detección de overflow falla

**Solución:**
- Badges en PanelRight: agregar `aria-label="N issues"` / `aria-label="N suggestions"`
- ComplexityBadge: `useEffect` que agrega handler `Escape` cuando `open === true`
- Toast: agregar `role="status" aria-live="polite"` al `motion.div` en `Toast.tsx`
- ConvertButton: `disabled={!query.trim()}` cuando no hay query
- `DROPDOWN_H`: calcular dinámicamente `DIALECTS.length * 61 + 8`

**Archivos:** `PanelRight.tsx`, `ComplexityBadge.tsx`, `Toast.tsx`, `DialectSelector.tsx`

---

## Feature 7 — Glossary Search (Medio)

**Problema:** En queries complejas con 30+ entradas, el glosario es difícil de escanear. No hay forma de filtrar por keyword, role, o descripción.

**Solución:** Agregar un input de búsqueda en la parte superior del GlossaryPanel. Filtrar por `keyword`, `role`, y `detail` (case-insensitive). Mostrar "No keywords match X" cuando no hay resultados. Solo visible cuando `glossary.length > 0`.

**Archivos:** `GlossaryPanel.tsx`

---

## Criterios de aceptación globales

- TypeScript clean (`npx tsc --noEmit` sin errores)
- Suite completa pasa (`npm run test`)
- Sin regresiones visuales en los 3 modos (explain, diff, stepper)
- Accesibilidad: aria-labels presentes en todos los elementos interactivos nuevos
