# Stepper Module Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mejorar el módulo de stepper con descripciones contextuales (usando la cláusula SQL real del nodo), speed control, `goToEnd`, pausa al hacer click manual en dots, barra de progreso visual, y navegación por teclado.

**Architecture:** Los cambios fluyen de adentro hacia afuera: primero los tipos, luego la lógica (execution-steps + useStepAnimation), luego la UI (StepperControls), y finalmente la integración (AppShell). Cada capa es independiente y testeable por separado.

**Tech Stack:** TypeScript · React · Framer Motion · Vitest · @testing-library/react

---

## File Map

| Acción | Archivo | Responsabilidad |
|--------|---------|-----------------|
| Modify | `src/types/index.ts` | Agregar `clause?: string` a `Step` |
| Modify | `src/lib/stepper/execution-steps.ts` | Descripciones contextuales + campo `clause` |
| Modify | `src/hooks/useStepAnimation.ts` | `speed`, `goToEnd`, `isComplete`, pausa en `goToIndex` |
| Rewrite | `src/components/diagram/StepperControls.tsx` | Nueva UI con progress bar, speed control, SkipForward |
| Modify | `src/components/layout/AppShell.tsx` | Keyboard handler con ref pattern |
| Modify | `src/__tests__/stepper/execution-steps.test.ts` | Tests para `clause` y JOIN+WHERE |

---

### Task 1: Extend Step type with `clause` field

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Agregar `clause?: string` a `Step`**

En `src/types/index.ts`, cambiar el interface `Step` (línea 77-83):

```ts
export interface Step {
  id: string
  nodeId: string
  title: string
  description: string
  edgeIds: string[]
  clause?: string   // ← nuevo: cláusula SQL real del nodo
}
```

- [ ] **Step 2: Verificar que el build sigue verde**

```powershell
& "C:\Program Files\nodejs\npx.cmd" tsc --noEmit
```

Esperado: 0 errores (el nuevo campo es opcional, no rompe código existente).

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(stepper): add clause field to Step type"
```

---

### Task 2: Contextual descriptions in buildSteps

**Files:**
- Modify: `src/lib/stepper/execution-steps.ts`
- Modify: `src/__tests__/stepper/execution-steps.test.ts`

El problema: `buildSteps()` usa descripciones genéricas de `NODE_DESCRIPTIONS`. El campo `node.data.clause` ya tiene el SQL real (ej. `WHERE o.total > 100`). Usarlo para hacer las descripciones contextuales.

- [ ] **Step 1: Agregar helpers `truncateClause` y `buildContextualDescription` en `execution-steps.ts`**

Insertar después de la constante `NODE_DESCRIPTIONS` (después de línea 42):

```ts
function truncateClause(clause: string, max = 72): string {
  return clause.length > max ? `${clause.slice(0, max)}…` : clause
}

function buildContextualDescription(nodeType: NodeType, clause: string): string {
  const base = NODE_DESCRIPTIONS[nodeType] ?? `Execute ${nodeType} step.`
  if (!clause) return base
  const c = truncateClause(clause)
  switch (nodeType) {
    case 'filter':    return `Filter: keeps rows matching \`${c}\`.`
    case 'join':      return `JOIN: matches rows using \`${c}\`.`
    case 'aggregate': return `GROUP BY \`${c}\`: rows grouped and aggregated.`
    case 'sort':      return `Sorted by \`${c}\`.`
    case 'limit':     return `\`${c}\`: only the first N rows are returned.`
    default:          return base
  }
}
```

- [ ] **Step 2: Actualizar `buildSteps` para usar `buildContextualDescription` y rellenar `clause`**

Dentro del loop `for (const node of matchingNodes)` (línea 78-89), reemplazar el bloque completo:

```ts
for (const node of matchingNodes) {
  const clause = node.data.clause ?? ''
  const description = buildContextualDescription(nodeType, clause)
  steps.push({
    id: `step-${stepIndex}`,
    nodeId: node.id,
    title: `Step ${stepIndex + 1}: ${node.data.label}`,
    description,
    edgeIds: getEdgesFrom(node.id, result.edges),
    clause: clause || undefined,
  })
  stepIndex++
}
```

- [ ] **Step 3: Escribir tests adicionales en `execution-steps.test.ts`**

Agregar al final del archivo:

```ts
describe('buildSteps — contextual descriptions', () => {
  it('filter step includes the WHERE clause in description', () => {
    const result = parseSQL('SELECT id FROM users WHERE active = true', 'postgresql')
    const steps = buildSteps(result)
    const filterStep = steps.find(s =>
      result.nodes.find(n => n.id === s.nodeId)?.data.nodeType === 'filter'
    )
    expect(filterStep).toBeDefined()
    expect(filterStep!.description).toContain('WHERE')
    expect(filterStep!.clause).toBeTruthy()
  })

  it('step has clause field matching node.data.clause', () => {
    const result = parseSQL('SELECT * FROM orders ORDER BY created_at DESC', 'postgresql')
    const steps = buildSteps(result)
    steps.forEach(step => {
      const node = result.nodes.find(n => n.id === step.nodeId)
      if (node?.data.clause) {
        expect(step.clause).toBe(node.data.clause)
      }
    })
  })
})

describe('buildSteps — JOIN + WHERE', () => {
  const sql = `
    SELECT u.id, o.total
    FROM users u
    JOIN orders o ON u.id = o.user_id
    WHERE o.total > 100
    ORDER BY o.total DESC
  `
  const result = parseSQL(sql, 'postgresql')

  it('generates steps for table, join, filter, output, sort', () => {
    const steps = buildSteps(result)
    const types = steps.map(s =>
      result.nodes.find(n => n.id === s.nodeId)?.data.nodeType
    )
    expect(types).toContain('table')
    expect(types).toContain('join')
    expect(types).toContain('filter')
    expect(types).toContain('output')
    expect(types).toContain('sort')
  })

  it('table comes before join, join before filter', () => {
    const steps = buildSteps(result)
    const idx = (type: string) => steps.findIndex(s =>
      result.nodes.find(n => n.id === s.nodeId)?.data.nodeType === type
    )
    expect(idx('table')).toBeLessThan(idx('join'))
    expect(idx('join')).toBeLessThan(idx('filter'))
  })
})
```

- [ ] **Step 4: Ejecutar tests y verificar que todos pasan**

```powershell
& "C:\Program Files\nodejs\npx.cmd" vitest run src/__tests__/stepper/
```

Esperado: todos los tests pasan (los existentes siguen funcionando, los nuevos también).

- [ ] **Step 5: Commit**

```bash
git add src/lib/stepper/execution-steps.ts src/__tests__/stepper/execution-steps.test.ts
git commit -m "feat(stepper): contextual descriptions using real SQL clause"
```

---

### Task 3: useStepAnimation — speed, goToEnd, isComplete, goToIndex pauses

**Files:**
- Rewrite: `src/hooks/useStepAnimation.ts`

Añadir: tipo `StepSpeed`, speed state, `goToEnd`, `isComplete`. `goToIndex` ahora pausa el auto-play. El timer respeta el speed.

- [ ] **Step 1: Reescribir `useStepAnimation.ts` completo**

```ts
import { useState, useEffect, useRef, useCallback } from 'react'
import type { Step } from '@/types'

export type StepSpeed = 500 | 1000 | 1500 | 2000

export interface StepAnimationState {
  currentIndex: number
  isPlaying: boolean
  isComplete: boolean
  totalSteps: number
  currentStep: Step | null
  speed: StepSpeed
  goNext: () => void
  goPrev: () => void
  goReset: () => void
  goToEnd: () => void
  togglePlay: () => void
  goToIndex: (i: number) => void
  setSpeed: (s: StepSpeed) => void
}

export function useStepAnimation(steps: Step[]): StepAnimationState {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState<StepSpeed>(1500)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setCurrentIndex(0)
    setIsPlaying(false)
  }, [steps])

  useEffect(() => {
    if (!isPlaying || steps.length === 0) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, speed)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isPlaying, steps.length, speed])

  const goNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(prev + 1, steps.length - 1))
  }, [steps.length])

  const goPrev = useCallback(() => {
    setCurrentIndex(prev => Math.max(prev - 1, 0))
  }, [])

  const goReset = useCallback(() => {
    setCurrentIndex(0)
    setIsPlaying(false)
  }, [])

  const goToEnd = useCallback(() => {
    setCurrentIndex(steps.length - 1)
    setIsPlaying(false)
  }, [steps.length])

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev)
  }, [])

  const goToIndex = useCallback((i: number) => {
    setIsPlaying(false)
    setCurrentIndex(Math.max(0, Math.min(i, steps.length - 1)))
  }, [steps.length])

  const isComplete = steps.length > 0 && currentIndex === steps.length - 1

  return {
    currentIndex, isPlaying, isComplete,
    totalSteps: steps.length,
    currentStep: steps[currentIndex] ?? null,
    speed, goNext, goPrev, goReset, goToEnd, togglePlay, goToIndex, setSpeed,
  }
}
```

- [ ] **Step 2: Verificar TypeScript**

```powershell
& "C:\Program Files\nodejs\npx.cmd" tsc --noEmit
```

Esperado: 0 errores. Si hay errores en `StepperControls.tsx` porque usa la interfaz vieja, es normal — se corrige en Task 4.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useStepAnimation.ts
git commit -m "feat(stepper): add speed control, goToEnd, isComplete, pause on goToIndex"
```

---

### Task 4: StepperControls — nueva UI completa

**Files:**
- Rewrite: `src/components/diagram/StepperControls.tsx`

Nuevos sub-componentes: `ProgressBar`, `StepDescription`, `ControlButtons` (con SkipForward), `ProgressDots`, `SpeedControl`. Mensaje "✓ Complete" al llegar al último step. Hint de teclado.

- [ ] **Step 1: Reescribir `StepperControls.tsx` completo**

```tsx
import { memo } from 'react'
import { motion } from 'framer-motion'
import { SkipBack, SkipForward, ChevronLeft, Play, Pause, ChevronRight } from 'lucide-react'
import type { StepAnimationState, StepSpeed } from '@/hooks/useStepAnimation'

interface StepperControlsProps {
  state: StepAnimationState
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ currentIndex, totalSteps }: { currentIndex: number; totalSteps: number }) {
  const pct = totalSteps <= 1 ? 100 : (currentIndex / (totalSteps - 1)) * 100
  return (
    <div style={{ height: 3, background: 'var(--border)', flexShrink: 0 }}>
      <motion.div
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        style={{ height: '100%', background: 'var(--a)' }}
      />
    </div>
  )
}

// ── Speed control ─────────────────────────────────────────────────────────────

const SPEEDS: { label: string; value: StepSpeed }[] = [
  { label: 'Slow', value: 2000 },
  { label: 'Normal', value: 1500 },
  { label: 'Fast', value: 500 },
]

function SpeedControl({ speed, setSpeed }: { speed: StepSpeed; setSpeed: (s: StepSpeed) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 'auto' }}>
      <span style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Speed</span>
      {SPEEDS.map(s => (
        <button
          key={s.value}
          onClick={() => setSpeed(s.value)}
          aria-pressed={speed === s.value}
          style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 4,
            background: speed === s.value ? 'var(--a-soft)' : 'var(--elevated)',
            border: `1px solid ${speed === s.value ? 'var(--a-border)' : 'var(--border)'}`,
            color: speed === s.value ? 'var(--a)' : 'var(--text-2)',
            cursor: 'pointer', fontWeight: speed === s.value ? 600 : 400,
            transition: 'all 0.15s',
          }}
        >{s.label}</button>
      ))}
    </div>
  )
}

// ── Step description ──────────────────────────────────────────────────────────

function StepDescription({ step, currentIndex, totalSteps, isComplete }: {
  step: NonNullable<StepAnimationState['currentStep']>
  currentIndex: number; totalSteps: number; isComplete: boolean
}) {
  const cleanTitle = step.title.replace(/^Step \d+: /, '')
  return (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ fontSize: 12, color: 'var(--text-1)', lineHeight: 1.5, display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 5 }}
    >
      <span style={{ fontWeight: 600, color: 'var(--a)', flexShrink: 0 }}>
        Step {currentIndex + 1} / {totalSteps}:
      </span>
      <span style={{ fontWeight: 600, flexShrink: 0 }}>{cleanTitle}</span>
      <span style={{ color: 'var(--text-2)' }}>— {step.description}</span>
      {isComplete && (
        <span style={{ fontSize: 10, color: '#22C55E', fontWeight: 700, marginLeft: 4, flexShrink: 0 }}>✓ Complete</span>
      )}
    </motion.div>
  )
}

// ── Control buttons ───────────────────────────────────────────────────────────

function ControlButtons({ state }: { state: StepAnimationState }) {
  const { currentIndex, isPlaying, totalSteps, goNext, goPrev, goReset, goToEnd, togglePlay } = state
  const atStart = currentIndex === 0
  const atEnd = currentIndex >= totalSteps - 1

  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    background: 'var(--elevated)', border: '1px solid var(--border)',
    borderRadius: 6, width: 30, height: 30,
    cursor: disabled ? 'not-allowed' : 'pointer',
    color: disabled ? 'var(--text-3)' : 'var(--text-2)',
    opacity: disabled ? 0.4 : 1, transition: 'opacity 0.15s, background 0.15s',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  })

  const playBtnStyle: React.CSSProperties = {
    background: isPlaying ? 'var(--a-soft)' : 'var(--elevated)',
    border: `1px solid ${isPlaying ? 'var(--a-border)' : 'var(--border)'}`,
    borderRadius: 6, width: 36, height: 36, cursor: 'pointer',
    color: isPlaying ? 'var(--a)' : 'var(--text-1)',
    transition: 'background 0.15s, color 0.15s, border-color 0.15s',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button onClick={goReset} disabled={atStart} aria-label="First step" style={btnStyle(atStart)}><SkipBack size={12} /></button>
      <button onClick={goPrev} disabled={atStart} aria-label="Previous step" style={btnStyle(atStart)}><ChevronLeft size={12} /></button>
      <button onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'} style={playBtnStyle}>
        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <button onClick={goNext} disabled={atEnd} aria-label="Next step" style={btnStyle(atEnd)}><ChevronRight size={12} /></button>
      <button onClick={goToEnd} disabled={atEnd} aria-label="Last step" style={btnStyle(atEnd)}><SkipForward size={12} /></button>
    </div>
  )
}

// ── Progress dots ─────────────────────────────────────────────────────────────

function ProgressDots({ state }: { state: StepAnimationState }) {
  const { currentIndex, totalSteps, goToIndex } = state
  const visible = Math.min(totalSteps, 12)
  return (
    <div style={{ display: 'flex', gap: 4, marginLeft: 4, flexWrap: 'wrap', alignItems: 'center' }}>
      {Array.from({ length: visible }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            scale: i === currentIndex ? 1.4 : 1,
            background: i === currentIndex ? 'var(--a)' : i < currentIndex ? 'var(--text-2)' : 'var(--border)',
          }}
          onClick={() => goToIndex(i)}
          title={`Step ${i + 1}`}
          style={{ width: 7, height: 7, borderRadius: '50%', cursor: 'pointer', flexShrink: 0 }}
        />
      ))}
      {totalSteps > 12 && (
        <span style={{ fontSize: 10, color: 'var(--text-2)', lineHeight: '7px' }}>+{totalSteps - 12}</span>
      )}
    </div>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export const StepperControls = memo(function StepperControls({ state }: StepperControlsProps) {
  const { totalSteps, currentStep, currentIndex, isComplete, speed, setSpeed } = state

  if (totalSteps === 0) {
    return (
      <div style={{
        height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderTop: '1px solid var(--border)', background: 'var(--surface)',
        color: 'var(--text-2)', fontSize: 12,
      }}>
        Parse a SQL query to start the stepper.
      </div>
    )
  }

  return (
    <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
      <ProgressBar currentIndex={currentIndex} totalSteps={totalSteps} />
      <div style={{ padding: '8px 16px 6px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {currentStep && (
          <StepDescription step={currentStep} currentIndex={currentIndex} totalSteps={totalSteps} isComplete={isComplete} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ControlButtons state={state} />
          <ProgressDots state={state} />
          <SpeedControl speed={speed} setSpeed={setSpeed} />
        </div>
        <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.03em' }}>
          ← → navigate · Space play/pause · Home first · End last
        </div>
      </div>
    </div>
  )
})
```

- [ ] **Step 2: Verificar TypeScript**

```powershell
& "C:\Program Files\nodejs\npx.cmd" tsc --noEmit
```

Esperado: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/diagram/StepperControls.tsx
git commit -m "feat(stepper): progress bar, speed control, SkipForward, completion badge"
```

---

### Task 5: Keyboard navigation en AppShell

**Files:**
- Modify: `src/components/layout/AppShell.tsx`

Agregar `useEffect` con keyboard handler usando ref pattern (evita stale closures). Activo solo cuando `mode === 'stepper'`. Ignora eventos cuando el foco está en textarea/input.

- [ ] **Step 1: Agregar import de `useRef` y el keyboard handler en `AppShell.tsx`**

En los imports de React (línea 1), cambiar `useState` a `useState, useEffect, useRef`:

```ts
import { useState, useEffect, useRef } from 'react'
```

- [ ] **Step 2: Agregar el ref y el useEffect después de definir `stepAnimation` (alrededor de línea 39)**

Insertar justo después de `const stepAnimation = useStepAnimation(steps)`:

```ts
const stepAnimRef = useRef(stepAnimation)
stepAnimRef.current = stepAnimation

useEffect(() => {
  if (mode !== 'stepper') return
  const handler = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'TEXTAREA' || tag === 'INPUT') return
    const sa = stepAnimRef.current
    switch (e.key) {
      case 'ArrowRight': sa.goNext(); break
      case 'ArrowLeft':  sa.goPrev(); break
      case ' ':          e.preventDefault(); sa.togglePlay(); break
      case 'Home':       e.preventDefault(); sa.goReset(); break
      case 'End':        e.preventDefault(); sa.goToEnd(); break
    }
  }
  document.addEventListener('keydown', handler)
  return () => document.removeEventListener('keydown', handler)
}, [mode])
```

- [ ] **Step 3: Verificar TypeScript**

```powershell
& "C:\Program Files\nodejs\npx.cmd" tsc --noEmit
```

Esperado: 0 errores.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/AppShell.tsx
git commit -m "feat(stepper): keyboard navigation (arrows, space, home/end)"
```

---

### Task 6: Full test suite run + build verification

- [ ] **Step 1: Ejecutar todos los tests**

```powershell
& "C:\Program Files\nodejs\npx.cmd" vitest run
```

Esperado: todos los tests pasan. Si alguno falla por la nueva firma de `StepAnimationState`, actualizar mocks/assertions para incluir los nuevos campos (`isComplete`, `speed`, `goToEnd`, `setSpeed`).

- [ ] **Step 2: Build de producción**

```powershell
& "C:\Program Files\nodejs\npx.cmd" vite build
```

Esperado: build exitoso sin errores.

- [ ] **Step 3: Commit final si hubo ajustes de tests**

```bash
git add -p
git commit -m "test(stepper): update assertions for new StepAnimationState shape"
```

---

## Self-Review Checklist

- [x] **Spec coverage**: contextual descriptions ✓, speed control ✓, goToEnd ✓, isComplete ✓, goToIndex pausa ✓, progress bar ✓, keyboard ✓
- [x] **Placeholders**: ninguno — todos los steps tienen código completo
- [x] **Type consistency**: `StepSpeed` definido en Task 3, importado en Task 4 · `goToEnd` definido en Task 3, usado en Task 4 y 5 · `clause` en Step definido en Task 1, rellenado en Task 2 · `isComplete` definido en Task 3, consumido en Task 4
- [x] **Backward compat**: todos los campos nuevos en `StepAnimationState` son adiciones, no cambios de nombre. Los tests existentes de stepper no mockean `useStepAnimation` directamente, así que no se rompen.
