import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'

interface SaveQueryFormProps {
  onClose: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 8px', borderRadius: 5, fontSize: 12,
  background: 'var(--elevated)', border: '1px solid var(--border)',
  color: 'var(--text-1)', outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 10, color: 'var(--text-3)', marginBottom: 3, display: 'block',
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function NewCollectionRow({ value, onChange, onCreate }: {
  value: string; onChange: (v: string) => void; onCreate: () => void
}) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input style={{ ...inputStyle, flex: 1 }} value={value} onChange={e => onChange(e.target.value)} placeholder="New collection name" />
      <button onClick={onCreate} style={{ padding: '6px 10px', borderRadius: 5, fontSize: 11, background: 'var(--elevated)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
        + New
      </button>
    </div>
  )
}

function FormActions({ onClose, disabled }: { onClose: () => void; disabled: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
      <button onClick={onClose} style={{ padding: '5px 12px', borderRadius: 5, fontSize: 11, background: 'none', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-2)' }}>
        Cancel
      </button>
      <button type="submit" disabled={disabled} style={{ padding: '5px 12px', borderRadius: 5, fontSize: 11, background: 'var(--a)', border: 'none', cursor: 'pointer', fontWeight: 700, color: '#000', opacity: disabled ? 0.5 : 1 }}>
        Save
      </button>
    </div>
  )
}

function CollectionSelect({ colId, onChange }: { colId: string; onChange: (id: string) => void }) {
  const collections = useAppStore((s) => s.collections)
  return (
    <FormField label="Collection">
      <select style={{ ...inputStyle, cursor: 'pointer' }} value={colId} onChange={e => onChange(e.target.value)}>
        {collections.map(c => (
          <option key={c.id} value={c.id}>{c.name} ({c.queries.length})</option>
        ))}
      </select>
    </FormField>
  )
}

function useSaveQueryForm(onClose: () => void) {
  const saveQueryToCollection = useAppStore((s) => s.saveQueryToCollection)
  const addCollection         = useAppStore((s) => s.addCollection)
  const collections           = useAppStore((s) => s.collections)
  const [name, setName]       = useState('')
  const [desc, setDesc]       = useState('')
  const [tags, setTags]       = useState('')
  const [colId, setColId]     = useState(collections[0]?.id ?? '')
  const [newColName, setNewColName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !colId) return
    saveQueryToCollection(colId, {
      name:        name.trim(),
      description: desc.trim() || undefined,
      tags:        tags.split(',').map(t => t.trim()).filter(Boolean),
    })
    onClose()
  }

  const handleCreateCollection = () => {
    if (!newColName.trim()) return
    addCollection(newColName.trim())
    setNewColName('')
  }

  return { name, setName, desc, setDesc, tags, setTags, colId, setColId, newColName, setNewColName, handleSubmit, handleCreateCollection }
}

export function SaveQueryForm({ onClose }: SaveQueryFormProps) {
  const { name, setName, desc, setDesc, tags, setTags, colId, setColId, newColName, setNewColName, handleSubmit, handleCreateCollection } = useSaveQueryForm(onClose)
  return (
    <form aria-label="Save query form" onSubmit={handleSubmit} style={{ padding: 14, width: 280, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>Save Query</div>
      <FormField label="Name *">
        <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="My query name" />
      </FormField>
      <FormField label="Description">
        <input style={inputStyle} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional" />
      </FormField>
      <FormField label="Tags (comma-separated)">
        <input style={inputStyle} value={tags} onChange={e => setTags(e.target.value)} placeholder="reporting, slow, draft" />
      </FormField>
      <CollectionSelect colId={colId} onChange={setColId} />
      <NewCollectionRow value={newColName} onChange={setNewColName} onCreate={handleCreateCollection} />
      <FormActions onClose={onClose} disabled={!name.trim() || !colId} />
    </form>
  )
}
