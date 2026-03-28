'use client'
import { useState, useEffect, KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useDebounce } from '@/hooks/useDebounce'
import DuplicateBanner from './DuplicateBanner'
import SpeakButton from './SpeakButton'
import MicButton from './MicButton'
import SpellSuggestion from './SpellSuggestion'
import { getLangCode } from '@/lib/speech'
import type { Direction, Word, Article } from '@/lib/types'
import { getArticleColor } from '@/lib/types'

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
  const [spellSuggestions, setSpellSuggestions] = useState<{ original: string; replacement: string; offset: number; length: number }[]>([])
  const [article, setArticle] = useState<Article>(null)

  const debouncedInput = useDebounce(input, 300)

  useEffect(() => {
    if (!debouncedInput.trim()) {
      setTranslation('')
      setDuplicate(null)
      setArticle(null)
      return
    }

    const dup = existingWords.find(
      w => w.word.toLowerCase() === debouncedInput.trim().toLowerCase() && w.direction === direction
    )
    setDuplicate(dup ?? null)

    if (!dup) {
      const controller = new AbortController()
      setIsTranslating(true)
      fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: debouncedInput.trim(), direction }),
        signal: controller.signal,
      })
        .then(r => r.json())
        .then(d => { if (!controller.signal.aborted) setTranslation(d.translation ?? '') })
        .catch(() => {})
        .finally(() => { if (!controller.signal.aborted) setIsTranslating(false) })

      return () => controller.abort()
    } else {
      setTranslation(dup.translation)
      setArticle(dup.article ?? null)
    }
  }, [debouncedInput, direction, existingWords])

  // For de-en: fetch article for the German input word
  useEffect(() => {
    if (direction !== 'de-en' || !debouncedInput.trim() || duplicate) {
      if (!duplicate) setArticle(null)
      return
    }
    const controller = new AbortController()
    fetch('/api/article', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: debouncedInput.trim() }),
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(d => setArticle(d.article ?? null))
      .catch(() => setArticle(null))
    return () => controller.abort()
  }, [debouncedInput, direction, duplicate])

  // For en-de: fetch article for the German translation once it arrives
  useEffect(() => {
    if (direction !== 'en-de' || !translation || isTranslating || duplicate) {
      return
    }
    const controller = new AbortController()
    fetch('/api/article', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: translation }),
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(d => setArticle(d.article ?? null))
      .catch(() => setArticle(null))
    return () => controller.abort()
  }, [translation, direction, isTranslating, duplicate])

  useEffect(() => {
    if (!debouncedInput.trim()) {
      setSpellSuggestions([])
      return
    }
    const sourceLangCode = direction === 'de-en' ? 'de' : 'en'
    fetch('/api/spellcheck', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: debouncedInput.trim(), language: sourceLangCode }),
    })
      .then(r => r.json())
      .then(d => {
        let suggestions = d.suggestions ?? []
        if (direction === 'en-de') {
          suggestions = suggestions.filter((s: { original: string; replacement: string }) =>
            s.original.toLowerCase() !== s.replacement.toLowerCase()
          )
        }
        setSpellSuggestions(suggestions)
      })
      .catch(() => setSpellSuggestions([]))
  }, [debouncedInput, direction])

  const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !input.trim() || !translation || duplicate) return

    const res = await fetch('/api/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: input.trim(), translation, direction, article }),
    })

    if (res.ok) {
      const saved: Word = await res.json()
      onWordSaved(saved)
      setInput('')
      setTranslation('')
      setArticle(null)
    }
  }

  const swapDirection = () => {
    setDirection(d => d === 'de-en' ? 'en-de' : 'de-en')
    setInput('')
    setTranslation('')
    setDuplicate(null)
    setSpellSuggestions([])
    setArticle(null)
  }

  const [sourceLang, targetLang] = direction === 'de-en' ? ['Deutsch', 'English'] : ['English', 'Deutsch']

  return (
    <div style={{
      background: 'var(--color-card-bg)',
      border: '0.5px solid var(--color-card-border)',
      borderRadius: '12px',
      overflow: 'hidden',
      marginBottom: '1.5rem',
    }}>
      {/* Language bar */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid var(--color-card-border)' }}>
        <div style={{ flex: 1, padding: '10px 16px', fontSize: '13px', fontWeight: 500, textAlign: 'center', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
          {sourceLang}
        </div>
        <button
          onClick={swapDirection}
          style={{
            width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--color-card-bg)', border: 'none', cursor: 'pointer',
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
      <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Type a ${sourceLang} word...`}
          style={{
            flex: 1, fontSize: '18px', fontWeight: 400,
            border: 'none', outline: 'none', background: 'transparent',
            color: 'var(--color-text-primary)', fontFamily: 'inherit',
          }}
          autoFocus
        />
        <MicButton lang={getLangCode(direction, 'source')} onResult={setInput} />
        {input.trim() && (
          <SpeakButton text={input.trim()} lang={getLangCode(direction, 'source')} />
        )}
      </div>

      {/* Spell suggestion */}
      <SpellSuggestion
        suggestions={spellSuggestions}
        input={input}
        onApply={(corrected) => { setInput(corrected); setSpellSuggestions([]) }}
      />

      {/* Result */}
      {(translation || isTranslating) && (
        <div style={{
          padding: '4px 16px 14px',
          borderTop: '0.5px solid var(--color-card-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '18px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AnimatePresence>
              {!isTranslating && article && direction === 'en-de' && (
                <motion.span
                  key="article-en-de"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ fontSize: '14px', fontWeight: 500, color: getArticleColor(article) }}
                >{article}</motion.span>
              )}
            </AnimatePresence>
            {isTranslating ? '...' : translation}
            {!isTranslating && translation && (
              <SpeakButton text={translation} lang={getLangCode(direction, 'target')} size={14} />
            )}
          </span>
          <AnimatePresence>
            {!isTranslating && article && direction === 'de-en' && (
              <motion.span
                key="article-de-en"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ fontSize: '13px', fontWeight: 500, color: getArticleColor(article), marginRight: '8px' }}
              >{article}</motion.span>
            )}
          </AnimatePresence>
          {!duplicate && translation && (
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              <kbd style={{
                background: 'var(--color-surface)', border: '0.5px solid var(--color-card-border)',
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
