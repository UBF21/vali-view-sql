import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { Dialect, AppMode } from '@/types'

const VALID_DIALECTS: Dialect[] = ['postgresql', 'mysql', 'sqlserver']
const VALID_MODES: AppMode[] = ['explain', 'diff', 'stepper']

// Lee la URL al montar y puebla el store
function readFromURL() {
  const params = new URLSearchParams(window.location.search)
  const q = params.get('q')
  const d = params.get('d') as Dialect | null
  const m = params.get('mode') as AppMode | null
  return {
    query: q ? decodeURIComponent(q) : null,
    dialect: d && VALID_DIALECTS.includes(d) ? d : null,
    mode: m && VALID_MODES.includes(m) ? m : null,
  }
}

// Escribe el estado actual a la URL sin recargar
function writeToURL(query: string, dialect: Dialect, mode: AppMode) {
  const params = new URLSearchParams()
  if (query.trim()) params.set('q', encodeURIComponent(query))
  params.set('d', dialect)
  params.set('mode', mode)
  const newUrl = `${window.location.pathname}?${params.toString()}`
  window.history.replaceState(null, '', newUrl)
}

export function useURLSync() {
  const query = useAppStore((s) => s.query)
  const dialect = useAppStore((s) => s.dialect)
  const mode = useAppStore((s) => s.mode)
  const setQuery = useAppStore((s) => s.setQuery)
  const setDialect = useAppStore((s) => s.setDialect)
  const setMode = useAppStore((s) => s.setMode)
  const initializedRef = useRef(false)

  // Al montar: leer URL y poblar store
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    const { query: urlQuery, dialect: urlDialect, mode: urlMode } = readFromURL()
    if (urlQuery) setQuery(urlQuery)
    if (urlDialect) setDialect(urlDialect)
    if (urlMode) setMode(urlMode)
  }, [setQuery, setDialect, setMode])

  // Al cambiar estado: actualizar URL
  useEffect(() => {
    if (!initializedRef.current) return
    writeToURL(query, dialect, mode)
  }, [query, dialect, mode])
}
