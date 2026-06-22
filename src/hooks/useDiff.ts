import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { parseSQLAsync } from '@/lib/parser'
import { diffQueries } from '@/lib/diff/query-diff'
import type { DiffDecorated } from '@/lib/diff/query-diff'

export interface DiffResult {
  diff: DiffDecorated | null
  diffError: string | null
}

export function useDiff(): DiffResult {
  const query = useAppStore((s) => s.query)
  const queryB = useAppStore((s) => s.queryB)
  const dialect = useAppStore((s) => s.dialect)
  const [diffResult, setDiffResult] = useState<DiffDecorated | null>(null)
  const [diffError, setDiffError] = useState<string | null>(null)

  useEffect(() => {
    if (!query.trim() || !queryB.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDiffResult(null)
      setDiffError(null)
      return
    }

    let cancelled = false
    Promise.all([
      parseSQLAsync(query, dialect),
      parseSQLAsync(queryB, dialect),
    ]).then(([resultA, resultB]) => {
      if (!cancelled) {
        setDiffResult(diffQueries(resultA, resultB))
        setDiffError(null)
      }
    }).catch((err: Error) => {
      if (!cancelled) {
        setDiffResult(null)
        setDiffError(err.message)
      }
    })

    return () => { cancelled = true }
  }, [query, queryB, dialect])

  return { diff: diffResult, diffError }
}
