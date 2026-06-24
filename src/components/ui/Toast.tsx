import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ToastProps {
  message: string
  visible: boolean
  onHide: () => void
  durationMs?: number
}

export function Toast({ message, visible, onHide, durationMs = 2000 }: ToastProps) {
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(onHide, durationMs)
    return () => clearTimeout(t)
  }, [visible, onHide, durationMs])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--accent)',
            color: '#fff',
            padding: '8px 20px',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 9999,
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
