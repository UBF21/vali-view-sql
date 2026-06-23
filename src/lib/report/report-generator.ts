import type { Issue, Suggestion, Dialect } from '@/types'
import type { ColumnLineage } from '@/lib/lineage/column-lineage'
import type { ComplexityResult } from '@/lib/complexity/complexity-score'

export interface ReportInput {
  sql:            string
  dialect:        Dialect
  diagramDataUrl: string | null
  complexity:     ComplexityResult | null
  issues:         Issue[]
  suggestions:    Suggestion[]
  lineage:        ColumnLineage
}

const LEVEL_COLOR: Record<string, string> = {
  Simple:          '#1D9E75',
  Moderate:        '#EF9F27',
  Complex:         '#E07B39',
  'Very Complex':  '#E24B4A',
}

const SEV_COLOR: Record<string, string> = {
  error:   '#E24B4A',
  warning: '#EF9F27',
  info:    '#4A90D9',
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildIssuesHtml(issues: Issue[]): string {
  if (!issues.length) return ''
  const cards = issues.map(i => `
  <div class="card issue-${i.severity}">
    <span class="badge" style="background:${SEV_COLOR[i.severity]}">${i.severity.toUpperCase()}</span>
    <strong>${escHtml(i.title)}</strong>
    <p>${escHtml(i.description)}</p>
    ${i.suggestion ? `<p class="suggestion"><em>Suggestion:</em> ${escHtml(i.suggestion)}</p>` : ''}
  </div>`).join('')
  return `<section><h2>Issues (${issues.length})</h2>${cards}</section>`
}

function buildSuggestionsHtml(suggestions: Suggestion[]): string {
  if (!suggestions.length) return ''
  const cards = suggestions.map(s => `
  <div class="card">
    <strong>${escHtml(s.title)}</strong>
    <span class="badge impact-${s.impact}">${s.impact.toUpperCase()} IMPACT</span>
    <p>${escHtml(s.reason)}</p>
    <div class="code-compare">
      <div><div class="label">Before</div><pre class="before">${escHtml(s.before)}</pre></div>
      <div><div class="label">After</div><pre class="after">${escHtml(s.after)}</pre></div>
    </div>
  </div>`).join('')
  return `<section><h2>Optimization Suggestions</h2>${cards}</section>`
}

function buildLineageHtml(lineage: ColumnLineage): string {
  if (!lineage.length) return ''
  const rows = lineage.map(e => `
    <tr>
      <td><code>${escHtml(e.outputAlias)}</code></td>
      <td>${e.expression ? `<code>${escHtml(e.expression)}</code>` : '—'}</td>
      <td>${e.sources.map(s => `<code>${s.table ? escHtml(s.table) + '.' : ''}${escHtml(s.column)}</code>`).join(', ')}</td>
    </tr>`).join('')
  return `<section><h2>Column Lineage</h2><table>
    <thead><tr><th>Output Column</th><th>Expression</th><th>Source(s)</th></tr></thead>
    <tbody>${rows}</tbody></table></section>`
}

function buildComplexityHtml(complexity: ComplexityResult | null): string {
  if (!complexity) return ''
  const color = LEVEL_COLOR[complexity.level] ?? '#888'
  const rows = Object.entries(complexity.breakdown)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `<tr><td>${escHtml(k.replace(/([A-Z])/g, ' $1').trim())}</td><td>${v}</td></tr>`)
    .join('')
  return `<section><h2>Complexity Analysis</h2>
  <div class="complexity-badge" style="border-color:${color}; color:${color}">
    ${escHtml(complexity.level)} — Score ${complexity.score}
  </div>
  <table><thead><tr><th>Factor</th><th>Count</th></tr></thead><tbody>${rows}</tbody></table>
  </section>`
}

function buildStyles(): string {
  return `<style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #1a202c; background: #fff; padding: 32px; max-width: 860px; margin: 0 auto; }
    h1 { font-size: 22px; margin-bottom: 4px } h2 { font-size: 16px; margin: 24px 0 12px; color: #2d3748; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px }
    .meta { font-size: 12px; color: #718096; margin-bottom: 24px } .meta span { margin-right: 16px }
    section { margin-bottom: 28px }
    .card { padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 10px }
    pre { font-family: monospace; font-size: 12px; padding: 10px 12px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; word-break: break-all }
    code { font-family: monospace; font-size: 12px }
    .sql-block { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 6px }
    .badge { font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 10px; color: #fff; display: inline-block; margin-right: 6px }
    .before { background: #fff5f5; color: #c53030 } .after { background: #f0fff4; color: #276749 }
    .code-compare { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px }
    .label { font-size: 10px; color: #718096; margin-bottom: 3px }
    table { width: 100%; border-collapse: collapse; font-size: 13px }
    th { text-align: left; padding: 7px 10px; background: #f7fafc; border: 1px solid #e2e8f0; font-size: 11px }
    td { padding: 7px 10px; border: 1px solid #e2e8f0 } tr:nth-child(even) td { background: #f7fafc }
    .complexity-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; border: 2px solid; font-weight: 700; margin-bottom: 12px }
    .issue-error { border-left: 3px solid #E24B4A } .issue-warning { border-left: 3px solid #EF9F27 } .issue-info { border-left: 3px solid #4A90D9 }
    .suggestion { margin-top: 6px; font-size: 12px; color: #4a5568 }
    .impact-high { background: #E24B4A } .impact-medium { background: #EF9F27 } .impact-low { background: #1D9E75 }
    @media print { body { padding: 0 } section { break-inside: avoid } }
  </style>`
}

export function generateReportHTML(input: ReportInput): string {
  const { sql, dialect, diagramDataUrl, complexity, issues, suggestions, lineage } = input
  const now      = new Date().toLocaleString()
  const first    = sql.match(/FROM\s+(\w+)/i)?.[1] ?? 'query'
  const title    = `${first} — SQL Analysis Report`
  const errCount = issues.filter(i => i.severity === 'error').length
  const warnCount = issues.filter(i => i.severity === 'warning').length
  const diagramHtml = diagramDataUrl
    ? `<section><h2>Execution Diagram</h2><img src="${diagramDataUrl}" alt="SQL execution diagram" style="max-width:100%; border-radius:6px; border:1px solid #e2e8f0" /></section>`
    : ''
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><title>${escHtml(title)}</title>${buildStyles()}</head>
<body>
  <h1>${escHtml(title)}</h1>
  <div class="meta">
    <span>Dialect: ${escHtml(dialect.toUpperCase())}</span>
    <span>Generated: ${escHtml(now)}</span>
    ${errCount > 0 ? `<span style="color:#E24B4A">${errCount} error${errCount !== 1 ? 's' : ''}</span>` : ''}
    ${warnCount > 0 ? `<span style="color:#EF9F27">${warnCount} warning${warnCount !== 1 ? 's' : ''}</span>` : ''}
  </div>
  <section><h2>SQL Query</h2><pre class="sql-block">${escHtml(sql)}</pre></section>
  ${diagramHtml}${buildComplexityHtml(complexity)}${buildIssuesHtml(issues)}${buildSuggestionsHtml(suggestions)}${buildLineageHtml(lineage)}
</body></html>`
}
