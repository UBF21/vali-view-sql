import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Dialect } from '@/types'

interface DialectSelectorProps {
  value: Dialect
  onChange: (dialect: Dialect) => void
  className?: string
}

const DIALECT_LABELS: Record<Dialect, string> = {
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  sqlserver: 'SQL Server',
}

export function DialectSelector({ value, onChange, className }: DialectSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Dialect)}>
      <SelectTrigger
        className={className}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          borderRadius: 6,
          fontSize: 12,
          height: 32,
          minWidth: 130,
        }}
      >
        <SelectValue placeholder="Dialect" />
      </SelectTrigger>
      <SelectContent
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          borderRadius: 6,
          fontSize: 12,
        }}
      >
        {(Object.entries(DIALECT_LABELS) as [Dialect, string][]).map(([val, label]) => (
          <SelectItem key={val} value={val} style={{ fontSize: 12 }}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
