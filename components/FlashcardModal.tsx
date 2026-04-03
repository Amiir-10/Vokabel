'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import FlashcardCard from '@/components/FlashcardCard'
import FlashcardSummary from '@/components/FlashcardSummary'
import type { Word, QuizDirection, AnswerMode } from '@/lib/types'

interface FlashcardModalProps {
  isOpen: boolean
  onClose: () => void
  words: Word[]
}

interface Result {
  wordId: string
  correct: boolean
}

type Phase = 'config' | 'playing' | 'summary'

export default function FlashcardModal({ isOpen, onClose, words }: FlashcardModalProps) {
  const [phase, setPhase] = useState<Phase>('config')
  const [direction, setDirection] = useState<QuizDirection>('de-en')
  const [mode, setMode] = useState<AnswerMode>('multiple-choice')
  const [batch, setBatch] = useState<Word[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setPhase('config')
      setBatch([])
      setCurrentIndex(0)
      setResults([])
    }
  }, [isOpen])

  async function startSession() {
    setLoading(true)
    const res = await fetch('/api/flashcards/batch', { method: 'POST' })
    const data = await res.json()
    setBatch(data)
    setCurrentIndex(0)
    setResults([])
    setPhase('playing')
    setLoading(false)
  }

  function handleAnswer(correct: boolean) {
    const word = batch[currentIndex]
    const newResults = [...results, { wordId: word.id, correct }]
    setResults(newResults)

    if (currentIndex + 1 < batch.length) {
      setCurrentIndex(i => i + 1)
    } else {
      setPhase('summary')
    }
  }

  function handlePlayAgain() {
    setPhase('config')
    setBatch([])
    setCurrentIndex(0)
    setResults([])
  }

  const toggleStyle = (active: boolean) => ({
    padding: '7px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
    fontSize: '13px', fontWeight: 500,
    background: active ? 'var(--color-text-primary)' : 'transparent',
    color: active ? 'var(--color-bg)' : 'var(--color-text-muted)',
    transition: 'all 0.15s',
  })

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
          onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            style={{
              width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto',
              background: 'var(--color-card-bg, var(--color-bg))',
              border: '1px solid var(--color-card-border)',
              borderRadius: '16px', padding: '28px',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>
                  Flashcards
                </p>
                {phase === 'playing' && (
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                    {currentIndex + 1} / {batch.length}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                style={{
                  width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--color-card-border)',
                  background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer',
                  fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            {/* Config phase */}
            {phase === 'config' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '8px' }}>Direction</p>
                  <div style={{ display: 'flex', gap: '4px', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-card-border)', background: 'var(--color-bg)', width: 'fit-content' }}>
                    <button style={toggleStyle(direction === 'de-en')} onClick={() => setDirection('de-en')}>German → English</button>
                    <button style={toggleStyle(direction === 'en-de')} onClick={() => setDirection('en-de')}>English → German</button>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '8px' }}>Mode</p>
                  <div style={{ display: 'flex', gap: '4px', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-card-border)', background: 'var(--color-bg)', width: 'fit-content' }}>
                    <button style={toggleStyle(mode === 'multiple-choice')} onClick={() => setMode('multiple-choice')}>Multiple choice</button>
                    <button style={toggleStyle(mode === 'free-text')} onClick={() => setMode('free-text')}>Free text</button>
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  {Math.min(20, words.length)} word{Math.min(20, words.length) !== 1 ? 's' : ''} in this batch
                </p>
                <button
                  onClick={startSession}
                  disabled={loading}
                  style={{
                    padding: '12px 0', borderRadius: '8px', border: 'none',
                    background: 'var(--color-text-primary)', color: 'var(--color-bg)',
                    fontSize: '15px', fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  {loading ? 'Loading...' : 'Start'}
                </button>
              </div>
            )}

            {/* Playing phase */}
            {phase === 'playing' && batch.length > 0 && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                >
                  <FlashcardCard
                    word={batch[currentIndex]}
                    direction={direction}
                    mode={mode}
                    allWords={words}
                    onAnswer={handleAnswer}
                  />
                </motion.div>
              </AnimatePresence>
            )}

            {/* Summary phase */}
            {phase === 'summary' && (
              <FlashcardSummary
                results={results}
                batch={batch}
                onPlayAgain={handlePlayAgain}
                onClose={onClose}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
