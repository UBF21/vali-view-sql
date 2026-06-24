import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react'
import { Code2, AlertTriangle, BookOpen, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, X, LayoutGrid, Loader2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { Header } from './Header'
import { QueryEditor } from '@/components/editor/QueryEditor'
import { DiagramCanvas } from '@/components/diagram/DiagramCanvas'
import { PanelRight } from './PanelRight'
import { DiffContent } from './DiffContent'
import { buildSteps, decorateNodesForStep, decorateEdgesForStep } from '@/lib/stepper/execution-steps'
import { useStepAnimation } from '@/hooks/useStepAnimation'
import { StepperControls } from '@/components/diagram/StepperControls'
import { ExportButton } from '@/components/diagram/ExportButton'
import { ZoomButtons } from '@/components/diagram/ZoomButtons'
import { ExamplePicker } from '@/components/editor/ExamplePicker'
import { CollectionPicker } from '@/components/editor/CollectionPicker'
import { SnippetPicker } from '@/components/editor/SnippetPicker'
import type { Node, Edge, SQLNodeData } from '@/types'
import { useIsMobile } from '@/hooks/useIsMobile'
import { MobileExplainLayout } from '@/components/mobile/MobileExplainLayout'
import { MobileDiffLayout } from '@/components/mobile/MobileDiffLayout'
import { MobileStepperLayout } from '@/components/mobile/MobileStepperLayout'

export function AppShell() {
  const query = useAppStore((s) => s.query)
  const setQuery = useAppStore((s) => s.setQuery)
  const dialect = useAppStore((s) => s.dialect)
  const parseResult = useAppStore((s) => s.parseResult)
  const isLoading = useAppStore((s) => s.isLoading)
  const mode = useAppStore((s) => s.mode)
  const issues = useAppStore((s) => s.issues)
  const infoNode = useAppStore((s) => s.infoNode)

  const highlightClause = infoNode?.clause

  const pendingSnippet      = useAppStore(s => s.pendingSnippet)
  const clearPendingSnippet = useAppStore(s => s.clearPendingSnippet)

  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false)
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false)
  const [rightPanelWidth, setRightPanelWidth] = useState(340)
  const [leftPanelWidth, setLeftPanelWidth] = useState(290)

  const nodes: Node<SQLNodeData>[] = parseResult?.nodes ?? []
  const edges: Edge[] = parseResult?.edges ?? []

  const steps = useMemo(
    () => parseResult ? buildSteps(parseResult) : [],
    [parseResult]
  )
  const stepAnimation = useStepAnimation(steps)
  const isMobile = useIsMobile()

  const stepAnimRef = useRef(stepAnimation)
  useLayoutEffect(() => {
    stepAnimRef.current = stepAnimation
  })

  useEffect(() => {
    if (mode !== 'stepper') return
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const isEditable = tag === 'TEXTAREA' || tag === 'INPUT' || (e.target as HTMLElement).isContentEditable
      if (isEditable) return
      const sa = stepAnimRef.current
      switch (e.key) {
        case 'ArrowRight': sa.goNext(); break
        case 'ArrowLeft':  sa.goPrev(); break
        case ' ':          e.preventDefault(); sa.togglePlay(); break
        case 'Home':       e.preventDefault(); sa.goReset(); break
        case 'End':        e.preventDefault(); sa.goToEnd(); break
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [mode])

  const stepNodes = parseResult
    ? decorateNodesForStep(parseResult, steps, stepAnimation.currentIndex)
    : []
  const stepEdges = parseResult
    ? decorateEdgesForStep(parseResult, steps, stepAnimation.currentIndex)
    : []

  const errorCount = issues.filter(i => i.severity === 'error').length
  const warnCount = issues.filter(i => i.severity === 'warning').length
  const issueCount = errorCount + warnCount

  const bodyClass = 'app-body'

  const gridStyle = {
    gridTemplateColumns: (() => {
      const left = leftCollapsed ? 'var(--icon-strip)' : `${leftPanelWidth}px`
      const right = rightCollapsed ? 'var(--icon-strip)' : `${rightPanelWidth}px`
      return `${left} 1fr ${right}`
    })()
  }

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = rightPanelWidth

    const onMouseMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX
      const newWidth = Math.min(500, Math.max(200, startWidth + delta))
      setRightPanelWidth(newWidth)
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const handleLeftResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = leftPanelWidth

    const onMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX
      const newWidth = Math.min(500, Math.max(200, startWidth + delta))
      setLeftPanelWidth(newWidth)
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const stepperContent = (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Left panel: SQL editor */}
      <div style={{
        width: 340, flexShrink: 0, borderRight: '1px solid var(--border)',
        padding: 12, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden',
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          SQL Query
        </div>
        <QueryEditor value={query} onChange={setQuery} dialect={dialect} style={{ flex: 1 }} highlightClause={highlightClause} />
      </div>
      {/* Diagram + stepper controls */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <DiagramCanvas nodes={stepNodes} edges={stepEdges} />
        </div>
        <StepperControls state={stepAnimation} />
      </div>
    </div>
  )

  const mobileExplainContent = (
    <MobileExplainLayout
      nodes={nodes}
      edges={edges}
      highlightClause={highlightClause}
    />
  )

  const mobileDiffContent = <MobileDiffLayout />

  const mobileStepperContent = (
    <MobileStepperLayout
      nodes={stepNodes}
      edges={stepEdges}
      stepAnimation={stepAnimation}
      highlightClause={highlightClause}
    />
  )

  const diffContent = <DiffContent />

  const explainContent = (
    <div className={bodyClass} style={{ flex: 1, overflow: 'hidden', ...gridStyle }}>

      {/* LEFT PANEL */}
      <div className={`side-panel side-panel-left${leftCollapsed ? ' collapsed' : ''}`}>
        <button
          className="col-btn"
          onClick={() => setLeftCollapsed(v => !v)}
          title={leftCollapsed ? 'Expand editor' : 'Collapse editor'}
          style={{ zIndex: 20 }}
        >
          {leftCollapsed
            ? <PanelLeftOpen size={10} />
            : <PanelLeftClose size={10} />}
        </button>

        {/* Resize handle — RIGHT edge of left panel */}
        {!leftCollapsed && (
          <div
            onMouseDown={handleLeftResizeMouseDown}
            title="Drag to resize"
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: 6,
              cursor: 'col-resize',
              zIndex: 5,
            }}
          />
        )}

        {/* Full content */}
        <div className="panel-content" style={{ padding: 12, gap: 8, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="panel-label">SQL Query</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <CollectionPicker />
              <SnippetPicker />
              <ExamplePicker />
            </div>
          </div>
          <QueryEditor value={query} onChange={setQuery} dialect={dialect} style={{ flex: 1 }} highlightClause={highlightClause} pendingSnippet={pendingSnippet} clearPendingSnippet={clearPendingSnippet} issues={issues} />
        </div>

        {/* Icon strip */}
        <div className="icon-strip">
          <button className="strip-icon" onClick={() => setLeftCollapsed(false)} title="Expand editor">
            <Code2 size={14} />
          </button>
          {issueCount > 0 && (
            <div className="strip-icon" title={`${issueCount} issues`}>
              <AlertTriangle size={14} />
              <span className="strip-badge">{issueCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* CENTER — CANVAS */}
      <div style={{ overflow: 'hidden', position: 'relative', minWidth: 0 }}>
        {isLoading && nodes.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 1,
          }}>
            <Loader2 size={28} className="spin" style={{ color: 'var(--text-2)', opacity: 0.5 }} />
          </div>
        )}
        {!isLoading && nodes.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8, opacity: 0.4,
            pointerEvents: 'none', zIndex: 1,
          }}>
            <LayoutGrid size={36} style={{ opacity: 0.4, color: 'var(--text-2)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Type a SQL query to visualize it</span>
          </div>
        )}
        <div style={{ width: '100%', height: '100%' }}>
          <DiagramCanvas nodes={nodes} edges={edges} />
        </div>
        <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ZoomButtons />
          <ExportButton />
        </div>

        {/* FAB bar — visible en tablet/mobile via CSS */}
        <div className="fab-bar">
          <button
            className={`fab${leftDrawerOpen ? ' open' : ''}`}
            onClick={() => setLeftDrawerOpen(v => !v)}
            title="Editor"
          >
            <Code2 size={15} />
            {issueCount > 0 && <span className="fab-badge">{issueCount}</span>}
          </button>
          <button
            className={`fab${rightDrawerOpen ? ' open' : ''}`}
            onClick={() => setRightDrawerOpen(v => !v)}
            title="Analysis"
          >
            <BookOpen size={15} />
          </button>
        </div>

        {/* LEFT DRAWER OVERLAY */}
        <div className={`drawer-overlay drawer-left${leftDrawerOpen ? ' open' : ''}`}>
          <div className="drawer-backdrop" onClick={() => setLeftDrawerOpen(false)} />
          <div className="drawer-panel">
            <div className="drawer-header">
              <span className="panel-label">SQL Query</span>
              <button className="drawer-close" onClick={() => setLeftDrawerOpen(false)}>
                <X size={12} />
              </button>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 12, gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <CollectionPicker />
                <ExamplePicker />
              </div>
              <QueryEditor value={query} onChange={setQuery} dialect={dialect} style={{ flex: 1 }} highlightClause={highlightClause} />
            </div>
          </div>
        </div>

        {/* RIGHT DRAWER OVERLAY */}
        <div className={`drawer-overlay drawer-right${rightDrawerOpen ? ' open' : ''}`}>
          <div className="drawer-backdrop" onClick={() => setRightDrawerOpen(false)} />
          <div className="drawer-panel">
            <div className="drawer-header">
              <span className="panel-label">Analysis</span>
              <button className="drawer-close" onClick={() => setRightDrawerOpen(false)}>
                <X size={12} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <PanelRight />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className={`side-panel side-panel-right${rightCollapsed ? ' collapsed' : ''}`}>
        {/* Resize handle — z-index below col-btn so button stays clickable */}
        {!rightCollapsed && (
          <div
            onMouseDown={handleResizeMouseDown}
            title="Drag to resize"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 6,
              cursor: 'col-resize',
              zIndex: 5,
            }}
          />
        )}
        <button
          className="col-btn"
          onClick={() => setRightCollapsed(v => !v)}
          title={rightCollapsed ? 'Expand panel' : 'Collapse panel'}
          style={{ zIndex: 20 }}
        >
          {rightCollapsed
            ? <PanelRightOpen size={10} />
            : <PanelRightClose size={10} />}
        </button>

        <div className="panel-content">
          <PanelRight />
        </div>

        <div className="icon-strip">
          <button className="strip-icon" onClick={() => setRightCollapsed(false)} title="Expand panel">
            <BookOpen size={14} />
          </button>
        </div>
      </div>

    </div>
  )

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}
    >
      <Header />
      {isMobile
        ? (mode === 'stepper' ? mobileStepperContent : mode === 'diff' ? mobileDiffContent : mobileExplainContent)
        : (mode === 'stepper' ? stepperContent : mode === 'diff' ? diffContent : explainContent)
      }
    </div>
  )
}
