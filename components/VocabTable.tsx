'use client'
import { useState } from 'react'
import type { Word } from '@/lib/types'

interface Props {
  words: Word[]
  onDelete: (id: string) => void
  newWordId: string | null
  highlightId: string | null
}

export default function VocabTable({ words, onDelete, newWordId, highlightId }: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'de-en' | 'en-de'>('all')

  const filtered = words.filter(w => {
    const matchesFilter = filter === 'all' || w.direction === filter
    const q = search.toLowerCase()
    const matchesSearch = !q || w.word.toLowerCase().includes(q) || w.translation.toLowerCase().includes(q)
    return matchesFilter && matchesSearch
  })

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  return (
    <div>
      {/* Section header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Saved words
        </span>
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{words.length} words</span>
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search your words..."
          style={{
            flex: 1, height: '34px', padding: '0 12px', fontSize: '13px',
            border: '0.5px solid var(--color-card-border)', borderRadius: '8px',
            outline: 'none', fontFamily: 'inherit', background: 'white',
            color: 'var(--color-text-primary)',
          }}
        />
        {(['all', 'de-en', 'en-de'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              height: '34px', padding: '0 12px', fontSize: '12px', fontWeight: 500,
              border: filter === f ? 'none' : '0.5px solid var(--color-card-border)',
              borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit',
              background: filter === f ? '#E1F5EE' : 'white',
              color: filter === f ? 'var(--color-green-text)' : 'var(--color-text-muted)',
            }}
          >
            {f === 'all' ? 'All' : f === 'de-en' ? 'DE \u2192 EN' : 'EN \u2192 DE'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ border: '0.5px solid var(--color-card-border)', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--color-card-border)' }}>
              {['Word', 'Translation', 'Direction', 'Saved', ''].map(h => (
                <th key={h} style={{
                  padding: '8px 12px', fontSize: '11px', fontWeight: 500,
                  color: 'var(--color-text-muted)', textTransform: 'uppercase',
                  letterSpacing: '0.06em', textAlign: 'left',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((w, i) => (
              <tr
                key={w.id}
                id={`word-${w.id}`}
                style={{
                  borderBottom: i < filtered.length - 1 ? '0.5px solid var(--color-card-border)' : 'none',
                  background: highlightId === w.id ? 'var(--color-amber-bg)' : 'transparent',
                  transition: 'background 0.5s ease',
                }}
                className="vocab-row"
              >
                <td style={{ padding: '12px', fontSize: '14px', fontWeight: 500 }}>
                  {w.word}
                  {newWordId === w.id && (
                    <span style={{
                      display: 'inline-block', fontSize: '10px', fontWeight: 500,
                      color: 'var(--color-green-text)', background: 'var(--color-green-bg)',
                      borderRadius: '4px', padding: '2px 6px', marginLeft: '6px',
                    }}>new</span>
                  )}
                </td>
                <td style={{ padding: '12px', fontSize: '14px', color: 'var(--color-text-muted)' }}>{w.translation}</td>
                <td style={{ padding: '12px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  {w.direction === 'de-en' ? 'DE \u2192 EN' : 'EN \u2192 DE'}
                </td>
                <td style={{ padding: '12px', fontSize: '12px', color: 'var(--color-text-muted)' }}>{formatDate(w.created_at)}</td>
                <td style={{ padding: '12px' }}>
                  <button
                    onClick={() => onDelete(w.id)}
                    className="del-btn"
                    aria-label="Delete word"
                    style={{
                      width: '24px', height: '24px', borderRadius: '6px',
                      border: 'none', background: 'transparent', cursor: 'pointer',
                      fontSize: '14px', color: 'var(--color-text-muted)',
                      opacity: 0, transition: 'opacity 0.15s',
                    }}
                  >{'\u2715'}</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', fontSize: '14px', color: 'var(--color-text-muted)' }}>
                  {search ? 'No words match your search.' : 'No words saved yet. Type one above!'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`.vocab-row:hover .del-btn { opacity: 1 !important; } .vocab-row:hover { background: #F7F7F5 !important; }`}</style>
    </div>
  )
}
