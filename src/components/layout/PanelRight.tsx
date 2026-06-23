import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAppStore } from '@/store/useAppStore'
import { GlossaryPanel } from '@/components/panels/GlossaryPanel'
import { IssuesPanel } from '@/components/panels/IssuesPanel'
import { SuggestionsPanel } from '@/components/panels/SuggestionsPanel'
import { LineagePanel } from '@/components/panels/LineagePanel'
import { SchemaPanel } from '@/components/panels/SchemaPanel'

export function PanelRight() {
  const issues = useAppStore((s) => s.issues)
  const suggestions = useAppStore((s) => s.suggestions)

  const errorCount = issues.filter(i => i.severity === 'error').length
  const warnCount = issues.filter(i => i.severity === 'warning').length

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg-surface)',
    }}>
      <Tabs defaultValue="glossary" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TabsList style={{
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border)',
          borderRadius: 0,
          padding: '4px 8px',
          gap: 4,
          height: 40,
          flexShrink: 0,
        }}>
          <TabsTrigger value="glossary" style={{ fontSize: 11, padding: '3px 10px' }}>
            Glossary
          </TabsTrigger>
          <TabsTrigger value="issues" style={{ fontSize: 11, padding: '3px 10px', position: 'relative' }}>
            Issues
            {(errorCount + warnCount) > 0 && (
              <span style={{
                marginLeft: 4, fontSize: 10, padding: '0 4px',
                background: errorCount > 0 ? '#E24B4A' : '#EF9F27',
                color: '#fff', borderRadius: 10, fontWeight: 600,
              }}>
                {errorCount + warnCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="suggestions" style={{ fontSize: 11, padding: '3px 10px' }}>
            Suggestions
            {suggestions.length > 0 && (
              <span style={{
                marginLeft: 4, fontSize: 10, padding: '0 4px',
                background: '#1D9E75', color: '#fff', borderRadius: 10, fontWeight: 600,
              }}>
                {suggestions.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="lineage" style={{ fontSize: 11, padding: '3px 10px' }}>
            Lineage
          </TabsTrigger>
          <TabsTrigger value="schema" style={{ fontSize: 11, padding: '3px 10px' }}>
            Schema
          </TabsTrigger>
        </TabsList>

        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <TabsContent value="glossary" style={{ height: '100%', margin: 0, overflow: 'auto' }}>
            <GlossaryPanel />
          </TabsContent>
          <TabsContent value="issues" style={{ height: '100%', margin: 0, overflow: 'auto' }}>
            <IssuesPanel />
          </TabsContent>
          <TabsContent value="suggestions" style={{ height: '100%', margin: 0, overflow: 'auto' }}>
            <SuggestionsPanel />
          </TabsContent>
          <TabsContent value="lineage" style={{ height: '100%', margin: 0, overflow: 'auto' }}>
            <LineagePanel />
          </TabsContent>
          <TabsContent value="schema" style={{ height: '100%', margin: 0, overflow: 'auto' }}>
            <SchemaPanel />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
