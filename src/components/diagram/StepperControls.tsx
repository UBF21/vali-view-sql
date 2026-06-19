import { motion } from 'framer-motion'
import type { StepAnimationState } from '@/hooks/useStepAnimation'

interface StepperControlsProps {
  state: StepAnimationState
}

export function StepperControls({ state }: StepperControlsProps) {
  const { currentIndex, isPlaying, totalSteps, currentStep, goNext, goPrev, goReset, togglePlay } = state

  if (totalSteps === 0) {
    return (
      <div style={{
        height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderTop: '1px solid var(--border)', background: 'var(--bg-surface)',
        color: 'var(--text-secondary)', fontSize: 12,
      }}>
        Parse a SQL query to start the stepper.
      </div>
    )
  }

  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '6px 12px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 16,
    color: disabled ? 'var(--text-secondary)' : 'var(--text-primary)',
    opacity: disabled ? 0.4 : 1,
    transition: 'opacity 0.15s',
  })

  const playBtnStyle: React.CSSProperties = {
    background: isPlaying ? 'var(--accent)' : 'var(--bg-elevated)',
    border: `1px solid ${isPlaying ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 6,
    padding: '6px 16px',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    color: isPlaying ? '#fff' : 'var(--text-primary)',
    transition: 'background 0.15s, color 0.15s',
    minWidth: 80,
  }

  return (
    <div style={{
      height: 'auto',
      minHeight: 64,
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-surface)',
      padding: '8px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {/* Step description */}
      {currentStep && (
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}
        >
          <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
            Step {currentIndex + 1} / {totalSteps}:
          </span>
          {' '}
          <span style={{ fontWeight: 600 }}>{currentStep.title.replace(/^Step \d+: /, '')}</span>
          {' — '}
          <span style={{ color: 'var(--text-secondary)' }}>{currentStep.description}</span>
        </motion.div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={goReset}
          disabled={currentIndex === 0}
          aria-label="Reset to first step"
          style={btnStyle(currentIndex === 0)}
        >⏮</button>

        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          aria-label="Previous step"
          style={btnStyle(currentIndex === 0)}
        >⏪</button>

        <button
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          style={playBtnStyle}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>

        <button
          onClick={goNext}
          disabled={currentIndex >= totalSteps - 1}
          aria-label="Next step"
          style={btnStyle(currentIndex >= totalSteps - 1)}
        >⏩</button>

        {/* Progress dots — max 10 visible */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 8, flexWrap: 'wrap' }}>
          {Array.from({ length: Math.min(totalSteps, 10) }).map((_, i) => (
            <motion.div
              key={i}
              animate={{
                scale: i === currentIndex ? 1.3 : 1,
                background: i === currentIndex
                  ? 'var(--accent)'
                  : i < currentIndex
                  ? 'var(--text-secondary)'
                  : 'var(--border)',
              }}
              onClick={() => state.goToIndex(i)}
              style={{
                width: 8, height: 8, borderRadius: '50%',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            />
          ))}
          {totalSteps > 10 && (
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: '8px' }}>
              +{totalSteps - 10}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
