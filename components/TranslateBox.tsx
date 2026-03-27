'use client'
import { useState, useEffect, KeyboardEvent } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useDebounce } from '@/hooks/useDebounce'
import DuplicateBanner from './DuplicateBanner'
import type { Direction, Word } from '@/lib/types'

interface Props {
  onWordSaved: (word: Word) => void
  existingWords: Word[]
  onJumpToWord: (id: string) => void
}

export default function TranslateBox({ onWordSaved, existingWords, onJumpToWord }: Props) {
  const [input, setInput] = useState('')
  const [direction, setDirection] = useState<Direction>('de-en')
  const [translation, setTranslation] = useState('')
  const [duplicate, setDuplicate] = useState<Word | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)

  const debouncedInput = useDebounce(input, 300)

  useEffect(() => {
    if (!debouncedInput.trim()) {
      setTranslation('')
      setDuplicate(null)
      return
    }

    const dup = existingWords.find(
      w => w.word.toLowerCase() === debouncedInput.trim().toLowerCase() && w.direction === direction
    )
    setDuplicate(dup ?? null)

    if (!dup) {
      setIsTranslating(true)
      fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: debouncedInput.trim(), direction }),
      })
        .then(r => r.json())
        .then(d => setTranslation(d.translation ?? ''))
        .finally(() => setIsTranslating(false))
    } else {
      setTranslation(dup.translation)
    }
  }, [debouncedInput, direction, existingWords])

  const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !input.trim() || !translation || duplicate) return

    const res = await fetch('/api/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: input.trim(), translation, direction }),
    })

    if (res.ok) {
      const saved: Word = await res.json()
      onWordSaved(saved)
      setInput('')
      setTranslation('')
    }
  }

  const swapDirection = () => {
    setDirection(d => d === 'de-en' ? 'en-de' : 'de-en')
    setInput('')
    setTranslation('')
    setDuplicate(null)
  }

  const [sourceLang, targetLang] = direction === 'de-en' ? ['Deutsch', 'English'] : ['English', 'Deutsch']

  return (
    <div style={{
      background: 'white',
      border: '0.5px solid var(--color-card-border)',
      borderRadius: '12px',
      overflow: 'hidden',
      marginBottom: '1.5rem',
    }}>
      {/* Language bar */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid var(--color-card-border)' }}>
        <div style={{ flex: 1, padding: '10px 16px', fontSize: '13px', fontWeight: 500, textAlign: 'center', background: '#F5F5F3', color: 'var(--color-text-primary)' }}>
          {sourceLang}
        </div>
        <button
          onClick={swapDirection}
          style={{
            width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'white', border: 'none', cursor: 'pointer',
            borderLeft: '0.5px solid var(--color-card-border)',
            borderRight: '0.5px solid var(--color-card-border)',
          }}
          aria-label="Swap languages"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5">
            <path d="M2 5h10M9 2l3 3-3 3M14 11H4M7 8l-3 3 3 3"/>
          </svg>
        </button>
        <div style={{ flex: 1, padding: '10px 16px', fontSize: '13px', fontWeight: 500, textAlign: 'center', color: 'var(--color-text-muted)' }}>
          {targetLang}
        </div>
      </div>

      {/* Input */}
      <div style={{ padding: '16px' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Type a ${sourceLang} word...`}
          style={{
            width: '100%', fontSize: '18px', fontWeight: 400,
            border: 'none', outline: 'none', background: 'transparent',
            color: 'var(--color-text-primary)', fontFamily: 'inherit',
          }}
          autoFocus
        />
      </div>

      {/* Result */}
      {(translation || isTranslating) && (
        <div style={{
          padding: '4px 16px 14px',
          borderTop: '0.5px solid var(--color-card-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '18px', color: 'var(--color-text-muted)' }}>
            {isTranslating ? '...' : translation}
          </span>
          {!duplicate && translation && (
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              <kbd style={{
                background: '#F5F5F3', border: '0.5px solid var(--color-card-border)',
                borderRadius: '4px', padding: '1px 6px', fontSize: '11px', fontWeight: 500,
              }}>Enter</kbd> to save
            </span>
          )}
        </div>
      )}

      {/* Duplicate banner */}
      <AnimatePresence>
        {duplicate && (
          <DuplicateBanner
            savedOn={duplicate.created_at}
            onJump={() => onJumpToWord(duplicate.id)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
