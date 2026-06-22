# Responsive Mobile & Tablet — Design Spec

**Date:** 2026-06-21  
**Branch:** feat/responsive-mobile

---

## Goal

Make vali-viewsql fully usable on mobile (≤768px) and tablet (769–1024px), maintaining the existing dark Obsidian-Glass aesthetic.

---

## Breakpoints

| Name    | Range         | Strategy |
|---------|---------------|----------|
| Mobile  | ≤768px        | Swipe views + bottom sheet nav |
| Tablet  | 769–1024px    | Keep existing drawer/FAB (900px → 1024px breakpoint) |
| Desktop | >1024px       | Existing layout — untouched |

---

## 1. Header (mobile ≤768px)

**Current:** `grid 1fr auto 1fr` — logo left, mode tabs center, dialect+actions right  
**Mobile:** logo left + `Menu` icon (lucide) right. Everything else hidden.

- Height stays 48px
- Mode tabs: `display:none` on mobile (mode switching via bottom sheet)
- Dialect selector, Copy Link, theme toggle: hidden from header on mobile (dialect moved into bottom sheet)
- Theme toggle stays visible as icon-only on mobile (no label)

---

## 2. Mode Switcher — Bottom Sheet

Opens when user taps `Menu` (lucide `Menu` icon, 20px).

**Animation:** slides up from bottom via Framer Motion (`y: "100%" → 0`, spring stiffness 300 damping 30).  
**Backdrop:** semi-transparent blur overlay, tap to close.

**Contents (top → bottom):**
1. Handle bar (32px wide × 3px, centered, `--border-hi` color)
2. `<span>Switch mode</span>` label (9px uppercase `--text-3`)
3. Three mode rows — each: `[icon 20px] [name bold] [description muted 9px]`
   - Explain — `BookOpen` icon — "Visualize SQL as diagram"
   - Diff — `GitCompare` icon — "Compare two queries"
   - Stepper — `Play` icon — "Step through execution"
   - Active mode row: amber highlight background + amber text
4. Divider
5. Dialect selector (full width, compact style)
6. Bottom safe area padding (env safe-area-inset-bottom)

Closes on: mode row tap, backdrop tap, `Escape` key.

---

## 3. Explain Mode (mobile)

**Layout:** swipe horizontal between 3 views.

```
[Header 48px]
[Tab bar 38px] — ✏️ Editor | ⬡ Diagram | 📊 Analysis
[Active view — flex:1]
```

**Tab bar:** 3 equal-width tappable tabs. Active tab: amber underline (2px) + amber text. Inactive: `--text-3`.

**Views:**
- `[0] Editor` — full `QueryEditor` + `HistoryPicker` + `ExamplePicker` at top
- `[1] Diagram` — full `DiagramCanvas` (default active on mount)
- `[2] Analysis` — full `PanelRight`

**Swipe detection:**
- `touchstart` → record `startX`
- `touchend` → if `|delta| ≥ 50px` → advance/retreat view index
- Ignore vertical-dominant swipes (`|dy| > |dx|`)

**Diagram view extras:** `ExportButton` FAB bottom-right (already exists).

---

## 4. Diff Mode (mobile)

**Layout:** swipe horizontal between 2 views.

```
[Header 48px]
[Tab bar 38px] — Query A | Query B
[DiffSummaryBar ~30px — always visible]
[Active view — flex:1]  Editor (40%) + Diagram (60%)
```

**Tab bar:** "Query A" (blue `#3B82F6`) | "Query B" (orange `#F97316`). Active underline matches query color.

**Views:**
- `[0] Query A` — `QueryEditor` (query A, `flex: 0 0 40%`) + `DiagramCanvas` (nodesA/edgesA, `flex: 1`)
- `[1] Query B` — `QueryEditor` (query B) + `DiagramCanvas` (nodesB/edgesB)

Each view stacks editor on top, diagram below. DiffLegend omitted on mobile (too cramped).

---

## 5. Stepper Mode (mobile)

```
[Header 48px]
[Canvas — flex:1, position:relative]
  [FAB "✏️ SQL" — absolute bottom-left 12px]
[StepperControls bar — fixed bottom]
```

**No swipe navigation** — stepper already has ← → tap and keyboard.

**FAB "SQL":** `bottom:12px left:12px`, pill shape, opens SQL editor as a separate bottom sheet (same slide-up animation as mode sheet). Bottom sheet has `QueryEditor` + `HistoryPicker` + `ExamplePicker`. Closes via handle-drag or X button.

**StepperControls:** existing component, unchanged. Always visible in stepper mode.

---

## 6. New Files

| File | Purpose |
|------|---------|
| `src/hooks/useIsMobile.ts` | `useIsMobile(bp=768): boolean` via `matchMedia` |
| `src/components/mobile/MobileBottomSheet.tsx` | Reusable animated bottom sheet wrapper |
| `src/components/mobile/MobileNavSheet.tsx` | Mode selector sheet (uses `MobileBottomSheet`) |
| `src/components/mobile/MobileSwipeLayout.tsx` | Generic swipeable views container + tab bar |
| `src/components/mobile/MobileExplainLayout.tsx` | Explain 3-view swipe layout |
| `src/components/mobile/MobileDiffLayout.tsx` | Diff 2-view swipe layout |
| `src/components/mobile/MobileStepperLayout.tsx` | Stepper: canvas + FAB + controls |

## 7. Modified Files

| File | Change |
|------|--------|
| `src/components/layout/Header.tsx` | Add `isMobile` branch: logo + Menu icon |
| `src/components/layout/AppShell.tsx` | Use mobile layouts when `isMobile` |
| `src/index.css` | Update `@media` breakpoints; add mobile CSS vars |

---

## 8. Constraints

- No new dependencies (use existing framer-motion, lucide-react, zustand)
- CSS variables (`--a`, `--border`, etc.) used throughout — no hardcoded colors
- All touch targets ≥44px height
- Keyboard navigation unchanged on desktop
- `StepperControls` keyboard hints hidden on mobile (touch-only)
