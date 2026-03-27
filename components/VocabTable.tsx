'use client'
import { useState, Fragment } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Word } from '@/lib/types'
import { getArticleColor } from '@/lib/types'
import SpeakButton from './SpeakButton'
import { getLangCode } from '@/lib/speech'

interface Props {
  words: Word[]
  onDelete: (id: string) => void
  newWordId: string | null
  highlightId: string | null
}

export default function VocabTable({ words, onDelete, newWordId, highlightId }: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'de-en' | 'en-de'>('all')
  const [expandedExampleId, setExpandedExampleId] = useState<string | null>(null)
  const [exampleData, setExampleData] = useState<{ german: string; english: string } | null>(null)
  const [exampleLoading, setExampleLoading] = useState(false)

  const handleExampleClick = async (w: Word) => {
    if (expandedExampleId === w.id) {
      setExpandedExampleId(null)
      return
    }
    setExpandedExampleId(w.id)
    setExampleLoading(true)
    setExampleData(null)
    const germanWord = w.direction === 'de-en' ? w.word : w.translation
    try {
      const res = await fetch('/api/example', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: germanWord }),
      })
      const data = await res.json()
      setExampleData(data.german ? data : null)
    } catch {
      setExampleData(null)
    }
    setExampleLoading(false)
  }

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
            outline: 'none', fontFamily: 'inherit', background: 'var(--color-card-bg)',
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
              background: filter === f ? 'var(--color-green-bg)' : 'var(--color-card-bg)',
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
              <Fragment key={w.id}>
              <tr
                id={`word-${w.id}`}
                style={{
                  borderBottom: i < filtered.length - 1 ? '0.5px solid var(--color-card-border)' : 'none',
                  background: highlightId === w.id ? 'var(--color-amber-bg)' : 'transparent',
                  transition: 'background 0.5s ease',
                }}
                className="vocab-row"
              >
                {(() => {
                  const deWord = w.direction === 'de-en' ? w.word : w.translation
                  const enWord = w.direction === 'de-en' ? w.translation : w.word
                  return (
                    <>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: 500 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {w.article && (
                            <span style={{ fontSize: '12px', fontWeight: 500, color: getArticleColor(w.article) }}>{w.article}</span>
                          )}
                          {deWord}
                          <span className="speak-btn" style={{ opacity: 0, transition: 'opacity 0.15s' }}>
                            <SpeakButton text={deWord} lang="de-DE" size={14} />
                          </span>
                          {newWordId === w.id && (
                            <span style={{
                              display: 'inline-block', fontSize: '10px', fontWeight: 500,
                              color: 'var(--color-green-text)', background: 'var(--color-green-bg)',
                              borderRadius: '4px', padding: '2px 6px', marginLeft: '2px',
                            }}>new</span>
                          )}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: 'var(--color-text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {enWord}
                          <span className="speak-btn" style={{ opacity: 0, transition: 'opacity 0.15s' }}>
                            <SpeakButton text={enWord} lang="en-US" size={14} />
                          </span>
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        DE &rarr; EN
                      </td>
                    </>
                  )
                })()}
                <td style={{ padding: '12px', fontSize: '12px', color: 'var(--color-text-muted)' }}>{formatDate(w.created_at)}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                    <button
                      onClick={() => handleExampleClick(w)}
                      className="example-btn"
                      aria-label="Show example sentence"
                      style={{
                        width: '24px', height: '24px', borderRadius: '6px',
                        border: 'none',
                        background: expandedExampleId === w.id ? 'var(--color-surface)' : 'transparent',
                        cursor: 'pointer', color: 'var(--color-text-muted)',
                        opacity: expandedExampleId === w.id ? 1 : 0, transition: 'opacity 0.15s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 2h4.5c1 0 1.5.5 1.5 1.5v11L6.5 13H2V2Z" />
                        <path d="M14 2H9.5C8.5 2 8 2.5 8 3.5v11l1.5-1.5H14V2Z" />
                      </svg>
                    </button>
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
                  </span>
                </td>
              </tr>
              <AnimatePresence>
                {expandedExampleId === w.id && (
                  <motion.tr
                    key={`example-${w.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <td colSpan={5} style={{
                      padding: '8px 12px 12px',
                      fontSize: '13px',
                      color: 'var(--color-text-muted)',
                      borderBottom: '0.5px solid var(--color-card-border)',
                      background: 'var(--color-surface)',
                    }}>
                      {exampleLoading ? '...' : exampleData ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div><span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>DE:</span> {exampleData.german}</div>
                          <div><span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>EN:</span> {exampleData.english}</div>
                        </div>
                      ) : 'No example available for this word.'}
                    </td>
                  </motion.tr>
                )}
              </AnimatePresence>
              </Fragment>
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

      <style>{`.vocab-row:hover .del-btn { opacity: 1 !important; } .vocab-row:hover .speak-btn { opacity: 1 !important; } .vocab-row:hover .example-btn { opacity: 1 !important; } .vocab-row:hover { background: var(--color-row-hover) !important; }`}</style>
    </div>
  )
}
