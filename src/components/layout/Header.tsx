import { useState, useCallback } from 'react'
import { Link2, Sun, Moon, Database, Menu } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { DialectSelector } from '@/components/editor/DialectSelector'
import { Toast } from '@/components/ui/Toast'
import { MobileNavSheet } from '@/components/mobile/MobileNavSheet'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { Dialect, AppMode } from '@/types'

// ── Constants ──────────────────────────────────────────────────────────────────

const HEADER_STYLE: React.CSSProperties = {
  height: 48, background: 'var(--surface)',
  borderBottom: '1px solid var(--border)', flexShrink: 0,
}

const BTN_ICON_STYLE: React.CSSProperties = {
  background: 'var(--elevated)', border: '1px solid var(--border)',
  borderRadius: 8, width: 36, height: 36, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

function useHeaderState() {
  const theme      = useAppStore((s) => s.theme)
  const setTheme   = useAppStore((s) => s.setTheme)
  const dialect    = useAppStore((s) => s.dialect)
  const setDialect = useAppStore((s) => s.setDialect)
  const mode       = useAppStore((s) => s.mode)
  const setMode    = useAppStore((s) => s.setMode)
  const [toastVisible, setToastVisible] = useState(false)
  const [navOpen, setNavOpen]           = useState(false)
  const isMobile = useIsMobile()

  const toggleTheme = useCallback(
    () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    [theme, setTheme],
  )
  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => setToastVisible(true))
      .catch(console.error)
  }, [])

  return { theme, dialect, setDialect, mode, setMode,
           toastVisible, setToastVisible, navOpen, setNavOpen,
           isMobile, toggleTheme, copyLink }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function LogoIcon() {
  return (
    <div className="logo-icon-glow" style={{ width: 26, height: 26, background: 'linear-gradient(135deg, #C8880A, #C04820)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Database size={14} color="#fff" />
    </div>
  )
}

function Logo({ isMobile }: { isMobile: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <LogoIcon />
      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-1)', whiteSpace: 'nowrap' }}>
        Vali-View-<span style={{ color: 'var(--a)' }}>SQL</span>
      </span>
      {!isMobile && (
        <span style={{ fontSize: 9, fontWeight: 600, background: 'var(--a-soft)', color: 'var(--a)', border: '1px solid var(--a-border)', borderRadius: 4, padding: '1px 6px', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          SQL Explainer
        </span>
      )}
    </div>
  )
}

function ThemeToggle({ theme, onToggle }: { theme: string; onToggle: () => void }) {
  const label = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`
  return (
    <button onClick={onToggle} aria-label={label} title={label}
      style={{ ...BTN_ICON_STYLE, borderRadius: 6, width: 30, height: 30, color: 'var(--text-2)' }}>
      {theme === 'dark' ? <Sun size={15} strokeWidth={2} /> : <Moon size={15} strokeWidth={2} />}
    </button>
  )
}

function MobileThemeToggle({ theme, onToggle }: { theme: string; onToggle: () => void }) {
  return (
    <button onClick={onToggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{ background: 'transparent', border: 'none', width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-2)' }}>
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}

function MenuButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button onClick={onOpen} aria-label="Open navigation menu"
      style={{ ...BTN_ICON_STYLE, color: 'var(--text-1)' }}>
      <Menu size={18} />
    </button>
  )
}

function ModeTabs({ mode, setMode }: { mode: AppMode; setMode: (m: AppMode) => void }) {
  return (
    <div className="mode-tabs" style={{ display: 'flex', alignSelf: 'stretch', alignItems: 'stretch' }}>
      {(['explain', 'diff', 'stepper'] as AppMode[]).map((m) => (
        <button key={m} onClick={() => setMode(m)} aria-label={`Switch to ${m} mode`}
          className={`mode-tab${mode === m ? ' active' : ''}`}>{m}</button>
      ))}
    </div>
  )
}

function CopyLinkButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Copy shareable link" title="Copy shareable link"
      style={{ background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
      <Link2 size={13} strokeWidth={2} /><span>Copy Link</span>
    </button>
  )
}

function DesktopActions({ dialect, setDialect, theme, onCopyLink, onToggle }: { dialect: Dialect; setDialect: (d: Dialect) => void; theme: string; onCopyLink: () => void; onToggle: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
      <DialectSelector value={dialect} onChange={(d: Dialect) => setDialect(d)} />
      <CopyLinkButton onClick={onCopyLink} />
      <ThemeToggle theme={theme} onToggle={onToggle} />
    </div>
  )
}

function MobileHeaderBar({ theme, onToggleTheme, onOpenNav }: { theme: string; onToggleTheme: () => void; onOpenNav: () => void }) {
  return (
    <header className="app-header" style={{ ...HEADER_STYLE, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
      <Logo isMobile />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <MobileThemeToggle theme={theme} onToggle={onToggleTheme} />
        <MenuButton onOpen={onOpenNav} />
      </div>
    </header>
  )
}

function DesktopHeaderBar({ mode, setMode, dialect, setDialect, theme, onCopyLink, onToggleTheme }: { mode: AppMode; setMode: (m: AppMode) => void; dialect: Dialect; setDialect: (d: Dialect) => void; theme: string; onCopyLink: () => void; onToggleTheme: () => void }) {
  return (
    <header className="app-header" style={{ ...HEADER_STYLE, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '0 16px' }}>
      <Logo isMobile={false} />
      <ModeTabs mode={mode} setMode={setMode} />
      <DesktopActions dialect={dialect} setDialect={setDialect} theme={theme} onCopyLink={onCopyLink} onToggle={onToggleTheme} />
    </header>
  )
}

// ── Public component ───────────────────────────────────────────────────────────

export function Header() {
  const { theme, dialect, setDialect, mode, setMode,
          toastVisible, setToastVisible, navOpen, setNavOpen,
          isMobile, toggleTheme, copyLink } = useHeaderState()

  return (
    <>
      {isMobile
        ? <MobileHeaderBar theme={theme} onToggleTheme={toggleTheme} onOpenNav={() => setNavOpen(true)} />
        : <DesktopHeaderBar mode={mode} setMode={setMode} dialect={dialect} setDialect={setDialect} theme={theme} onCopyLink={copyLink} onToggleTheme={toggleTheme} />
      }
      {isMobile && <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />}
      <Toast message="Link copied! 🔗" visible={toastVisible} onHide={() => setToastVisible(false)} />
    </>
  )
}
