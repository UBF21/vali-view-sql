import { useRef, useCallback } from 'react'

interface QueryEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function QueryEditor({ value, onChange, placeholder, className }: QueryEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value)
    },
    [onChange]
  )

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const el = e.currentTarget
      const start = el.selectionStart
      const end = el.selectionEnd
      const newValue = el.value.substring(0, start) + '  ' + el.value.substring(end)
      onChange(newValue)
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2
      })
    }
  }, [onChange])

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder ?? 'SELECT * FROM users WHERE active = true...'}
      spellCheck={false}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        resize: 'none',
        background: 'var(--bg-surface)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '12px 14px',
        fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", Consolas, monospace',
        fontSize: 13,
        lineHeight: 1.6,
        outline: 'none',
        boxSizing: 'border-box',
      }}
    />
  )
}
