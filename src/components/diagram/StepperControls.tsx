import { memo } from 'react'
import { motion } from 'framer-motion'
import { SkipBack, SkipForward, ChevronLeft, Play, Pause, ChevronRight, RotateCcw } from 'lucide-react'
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

function navBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    background: 'var(--elevated)', border: '1px solid var(--border)',
    borderRadius: 6, width: 30, height: 30,
    cursor: disabled ? 'not-allowed' : 'pointer',
    color: disabled ? 'var(--text-3)' : 'var(--text-2)',
    opacity: disabled ? 0.4 : 1, transition: 'opacity 0.15s, background 0.15s',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  }
}

function playBtnStyle(isPlaying: boolean): React.CSSProperties {
  return {
    background: isPlaying ? 'var(--a-soft)' : 'var(--elevated)',
    border: `1px solid ${isPlaying ? 'var(--a-border)' : 'var(--border)'}`,
    borderRadius: 6, width: 36, height: 36, cursor: 'pointer',
    color: isPlaying ? 'var(--a)' : 'var(--text-1)',
    transition: 'background 0.15s, color 0.15s, border-color 0.15s',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  }
}

function ControlButtons({ state }: { state: StepAnimationState }) {
  const { currentIndex, isPlaying, isComplete, totalSteps, goNext, goPrev, goReset, goToEnd, togglePlay } = state
  const atStart = currentIndex === 0
  const atEnd = currentIndex >= totalSteps - 1

  const playIcon = isPlaying ? <Pause size={14} /> : isComplete ? <RotateCcw size={14} /> : <Play size={14} />
  const playLabel = isPlaying ? 'Pause' : isComplete ? 'Restart from step 1' : 'Play'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button onClick={goReset} disabled={atStart && !isComplete} aria-label="First step" style={navBtnStyle(atStart && !isComplete)}><SkipBack size={12} /></button>
      <button onClick={goPrev} disabled={atStart} aria-label="Previous step" style={navBtnStyle(atStart)}><ChevronLeft size={12} /></button>
      <button onClick={togglePlay} aria-label={playLabel} style={playBtnStyle(isPlaying)}>
        {playIcon}
      </button>
      <button onClick={goNext} disabled={atEnd} aria-label="Next step" style={navBtnStyle(atEnd)}><ChevronRight size={12} /></button>
      <button onClick={goToEnd} disabled={atEnd} aria-label="Last step" style={navBtnStyle(atEnd)}><SkipForward size={12} /></button>
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
        <motion.button
          key={i}
          animate={{
            scale: i === currentIndex ? 1.4 : 1,
            background: i === currentIndex ? 'var(--a)' : i < currentIndex ? 'var(--text-2)' : 'var(--border)',
          }}
          onClick={() => goToIndex(i)}
          aria-label={`Go to step ${i + 1}`}
          title={`Step ${i + 1}`}
          style={{ width: 7, height: 7, borderRadius: '50%', cursor: 'pointer', flexShrink: 0, border: 'none', padding: 0 }}
        />
      ))}
      {totalSteps > 12 && (
        <span style={{ fontSize: 10, color: 'var(--text-2)', lineHeight: '7px' }}>+{totalSteps - 12}</span>
      )}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
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

function ControlsRow({ state }: { state: StepAnimationState }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <ControlButtons state={state} />
      <ProgressDots state={state} />
      <SpeedControl speed={state.speed} setSpeed={state.setSpeed} />
    </div>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export const StepperControls = memo(function StepperControls({ state }: StepperControlsProps) {
  const { totalSteps, currentStep, currentIndex, isComplete } = state
  if (totalSteps === 0) return <EmptyState />
  return (
    <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
      <ProgressBar currentIndex={currentIndex} totalSteps={totalSteps} />
      <div style={{ padding: '8px 16px 6px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {currentStep && (
          <StepDescription step={currentStep} currentIndex={currentIndex} totalSteps={totalSteps} isComplete={isComplete} />
        )}
        <ControlsRow state={state} />
        <div className="stepper-keyboard-hint" style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.03em' }}>
          ← → navigate · Space play/pause · Home first · End last
        </div>
      </div>
    </div>
  )
})
