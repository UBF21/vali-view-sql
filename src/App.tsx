import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { AppShell } from '@/components/layout/AppShell'
import { useParseQuery } from '@/hooks/useParseQuery'

function AppInner() {
  useParseQuery()
  return <AppShell />
}

export default function App() {
  const theme = useAppStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  return <AppInner />
}
