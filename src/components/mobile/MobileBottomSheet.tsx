// src/components/mobile/MobileBottomSheet.tsx
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface MobileBottomSheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  maxHeight?: string
}

function SheetBackdrop({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0,
        background: 'rgba(8,8,16,0.72)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    />
  )
}

function SheetHandle() {
  return (
    <div style={{ padding: '10px 0 4px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{ width: 32, height: 3, borderRadius: 2, background: 'var(--border-hi)' }} />
    </div>
  )
}

function SheetPanel({ maxHeight, children }: { maxHeight: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        maxHeight,
        background: 'var(--surface)',
        borderTop: '1px solid var(--border-hi)',
        borderRadius: '14px 14px 0 0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <SheetHandle />
      {children}
    </motion.div>
  )
}

export function MobileBottomSheet({ open, onClose, children, maxHeight = '80vh' }: MobileBottomSheetProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, pointerEvents: 'all' }}>
          <SheetBackdrop onClose={onClose} />
          <SheetPanel maxHeight={maxHeight}>{children}</SheetPanel>
        </div>
      )}
    </AnimatePresence>
  )
}
