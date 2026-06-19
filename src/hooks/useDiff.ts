import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { parseSQLAsync } from '@/lib/parser'
import { diffQueries } from '@/lib/diff/query-diff'
import type { DiffDecorated } from '@/lib/diff/query-diff'

export function useDiff(): DiffDecorated | null {
  const query = useAppStore((s) => s.query)
  const queryB = useAppStore((s) => s.queryB)
  const dialect = useAppStore((s) => s.dialect)
  const [diffResult, setDiffResult] = useState<DiffDecorated | null>(null)

  useEffect(() => {
    if (!query.trim() || !queryB.trim()) {
      setDiffResult(null)
      return
    }

    let cancelled = false
    Promise.all([
      parseSQLAsync(query, dialect),
      parseSQLAsync(queryB, dialect),
    ]).then(([resultA, resultB]) => {
      if (!cancelled) setDiffResult(diffQueries(resultA, resultB))
    }).catch(() => {
      if (!cancelled) setDiffResult(null)
    })

    return () => { cancelled = true }
  }, [query, queryB, dialect])

  return diffResult
}
