import { X, AlertTriangle, Info, Lightbulb, CheckCircle } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { Issue } from '@/types'

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  error: { color: '#E24B4A', bg: '#FFF1F0', label: 'Error', icon: <X size={12} /> },
  warning: { color: '#EF9F27', bg: '#FFFBF0', label: 'Warning', icon: <AlertTriangle size={12} /> },
  info: { color: '#1D9E75', bg: '#F0FDF9', label: 'Info', icon: <Info size={12} /> },
}

function IssueCard({ issue }: { issue: Issue }) {
  const config = SEVERITY_CONFIG[issue.severity]
  return (
    <div style={{
      marginBottom: 10,
      padding: '10px 12px',
      background: config.bg,
      borderRadius: 6,
      border: `1px solid ${config.color}30`,
      borderLeft: `3px solid ${config.color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ color: config.color, fontSize: 12, fontWeight: 700 }}>{config.icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#111', flex: 1 }}>{issue.title}</span>
        <span style={{
          fontSize: 10, padding: '1px 6px', borderRadius: 10,
          background: config.color, color: '#fff', fontWeight: 600,
        }}>
          {config.label}
        </span>
      </div>
      <p style={{ margin: '0 0 6px', fontSize: 11, color: '#444', lineHeight: 1.5 }}>
        {issue.description}
      </p>
      <p style={{ margin: 0, fontSize: 11, color: config.color, lineHeight: 1.4, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 4 }}>
        <Lightbulb size={12} /> {issue.suggestion}
      </p>
      {issue.dialectNote && (
        <span style={{ fontSize: 10, color: '#888', marginTop: 4, display: 'block' }}>
          Note: {issue.dialectNote}
        </span>
      )}
    </div>
  )
}

export function IssuesPanel() {
  const issues = useAppStore((s) => s.issues)

  if (issues.length === 0) {
    return (
      <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <CheckCircle size={14} /> No issues detected.
      </div>
    )
  }

  const errors = issues.filter(i => i.severity === 'error')
  const warnings = issues.filter(i => i.severity === 'warning')
  const infos = issues.filter(i => i.severity === 'info')

  return (
    <div style={{ padding: 12, overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {errors.length > 0 && (
          <span style={{ fontSize: 11, color: '#E24B4A', fontWeight: 600 }}>
            {errors.length} error{errors.length !== 1 ? 's' : ''}
          </span>
        )}
        {warnings.length > 0 && (
          <span style={{ fontSize: 11, color: '#EF9F27', fontWeight: 600 }}>
            {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
          </span>
        )}
        {infos.length > 0 && (
          <span style={{ fontSize: 11, color: '#1D9E75', fontWeight: 600 }}>
            {infos.length} info
          </span>
        )}
      </div>
      {[...errors, ...warnings, ...infos].map(issue => (
        <IssueCard key={issue.id} issue={issue} />
      ))}
    </div>
  )
}
