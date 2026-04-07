'use client'
import type { Word } from '@/lib/types'
import { normalizeWord } from '@/lib/types'

interface Result {
  wordId: string
  correct: boolean
}

interface FlashcardSummaryProps {
  results: Result[]
  batch: Word[]
  onPlayAgain: () => void
  onClose: () => void
}

export default function FlashcardSummary({ results, batch, onPlayAgain, onClose }: FlashcardSummaryProps) {
  const correct = results.filter(r => r.correct).length
  const total = results.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
          Session complete
        </p>
        <p style={{ fontSize: '40px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {correct} <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>/ {total}</span>
        </p>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
          {correct === total ? 'Perfect score!' : correct >= total * 0.8 ? 'Great job!' : correct >= total * 0.5 ? 'Keep practicing!' : 'More practice needed'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto' }}>
        {results.map((r, i) => {
          const word = batch.find(w => w.id === r.wordId)
          if (!word) return null
          const norm = normalizeWord(word)
          return (
            <div key={r.wordId} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', borderRadius: '8px',
              background: r.correct ? 'var(--color-green-bg)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${r.correct ? 'var(--color-green-border, #bbf7d0)' : 'rgba(239,68,68,0.2)'}`,
            }}>
              <span style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>{norm.german}</span>
              <span style={{ fontSize: '12px', color: r.correct ? 'var(--color-green-text)' : '#ef4444' }}>
                {r.correct ? '✓' : '✗'} {norm.english}
              </span>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={onPlayAgain}
          style={{
            flex: 1, padding: '10px 0', borderRadius: '8px', border: '1px solid var(--color-card-border)',
            background: 'var(--color-bg)', color: 'var(--color-text-primary)',
            fontSize: '14px', fontWeight: 500, cursor: 'pointer',
          }}
        >
          Play again
        </button>
        <button
          onClick={onClose}
          style={{
            flex: 1, padding: '10px 0', borderRadius: '8px', border: 'none',
            background: 'var(--color-text-primary)', color: 'var(--color-bg)',
            fontSize: '14px', fontWeight: 500, cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>
  )
}
