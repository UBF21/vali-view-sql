import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { parseSQLAsync } from '@/lib/parser'
import { runAnalyzers } from '@/lib/analyzers'
import { generateSuggestions } from '@/lib/optimizer/suggestions'
import { computeComplexity } from '@/lib/complexity/complexity-score'
import { extractColumnLineage } from '@/lib/lineage/column-lineage'

const DEBOUNCE_MS = 800

export function useParseQuery() {
  const query = useAppStore((s) => s.query)
  const dialect = useAppStore((s) => s.dialect)
  const setParseResult = useAppStore((s) => s.setParseResult)
  const setIsLoading = useAppStore((s) => s.setIsLoading)
  const setParseError = useAppStore((s) => s.setParseError)
  const addToHistory = useAppStore((s) => s.addToHistory)
  const setIssues = useAppStore((s) => s.setIssues)
  const setSuggestions = useAppStore((s) => s.setSuggestions)
  const setComplexityResult = useAppStore((s) => s.setComplexityResult)
  const setColumnLineage = useAppStore((s) => s.setColumnLineage)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!query.trim()) {
      setParseResult(null)
      setParseError(null)
      setComplexityResult(null)
      setColumnLineage([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      try {
        const result = await parseSQLAsync(query, dialect)
        setParseResult(result)
        setComplexityResult(computeComplexity(result))
        setColumnLineage(extractColumnLineage(result.rawAst))
        setParseError(null)

        const issues = result.rawAst != null
          ? runAnalyzers(result.rawAst, query, dialect)
          : []
        setIssues(issues)

        const suggestions = generateSuggestions(result.rawAst, issues, query)
        setSuggestions(suggestions)

        if (!result.nodes.some((n) => n.data.hasIssue)) {
          addToHistory(query, dialect)
        }
      } catch (err) {
        setParseError(err instanceof Error ? err.message : String(err))
        setParseResult(null)
        setComplexityResult(null)
        setColumnLineage([])
      } finally {
        setIsLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query, dialect, setParseResult, setIsLoading, setParseError, addToHistory, setIssues, setSuggestions, setComplexityResult, setColumnLineage])
}
