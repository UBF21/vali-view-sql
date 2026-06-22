import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { AppShell } from '@/components/layout/AppShell'
import { useParseQuery } from '@/hooks/useParseQuery'
import { useURLSync } from '@/hooks/useURLSync'

function AppInner() {
  useParseQuery()
  useURLSync()
  return <AppShell />
}

const PARTICLE_COLORS = ['#C8880A', '#C05838', '#8B7CF8', '#2EA87A']

export default function App() {
  const theme = useAppStore((s) => s.theme)
  const particlesRef = useRef<HTMLDivElement[]>([])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  // Spawn particles once on mount
  useEffect(() => {
    const particles: HTMLDivElement[] = []
    for (let i = 0; i < 14; i++) {
      const p = document.createElement('div')
      p.className = 'particle'
      const size = 1 + Math.random() * 1.5
      p.style.cssText = [
        `left:${Math.random() * 100}vw`,
        `top:${65 + Math.random() * 35}vh`,
        `background:${PARTICLE_COLORS[i % PARTICLE_COLORS.length]}`,
        `width:${size}px`,
        `height:${size}px`,
        `animation-duration:${7 + Math.random() * 10}s`,
        `animation-delay:${Math.random() * 9}s`,
      ].join(';')
      document.body.appendChild(p)
      particles.push(p)
    }
    particlesRef.current = particles
    return () => {
      particles.forEach(p => p.parentNode?.removeChild(p))
    }
  }, [])

  return (
    <>
      {/* Ambient orbs */}
      <div className="ambient" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>
      <AppInner />
    </>
  )
}
