'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getArticleColor } from '@/lib/types'
import type { Word, QuizDirection, AnswerMode } from '@/lib/types'

interface FlashcardCardProps {
  word: Word
  direction: QuizDirection
  mode: AnswerMode
  allWords: Word[]
  onAnswer: (correct: boolean) => void
}

function getQuestion(word: Word, direction: QuizDirection): string {
  // de-en: show German word; en-de: show English word
  return direction === 'de-en' ? word.word : word.translation
}

function getCorrectAnswer(word: Word, direction: QuizDirection): string {
  return direction === 'de-en' ? word.translation : word.word
}

function getDistractors(word: Word, allWords: Word[], direction: QuizDirection, count: number): string[] {
  const pool = allWords.filter(w => w.id !== word.id)
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count).map(w => getCorrectAnswer(w, direction))
}

export default function FlashcardCard({ word, direction, mode, allWords, onAnswer }: FlashcardCardProps) {
  const [answered, setAnswered] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [shownCorrect, setShownCorrect] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [checking, setChecking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const question = getQuestion(word, direction)
  const correctAnswer = getCorrectAnswer(word, direction)
  const distractorCount = Math.min(3, allWords.length - 1)
  const [options] = useState(() => {
    const distractors = getDistractors(word, allWords, direction, distractorCount)
    const all = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5)
    return all
  })

  useEffect(() => {
    if (mode === 'free-text') inputRef.current?.focus()
  }, [mode])

  async function submitAnswer(userAnswer: string) {
    if (answered || checking) return
    setChecking(true)

    let isCorrect = false

    if (mode === 'multiple-choice') {
      isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
    } else {
      const res = await fetch('/api/flashcards/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAnswer,
          correctAnswer,
          originalWord: word.word,
          direction,
        }),
      })
      const data = await res.json()
      isCorrect = data.correct
      if (!isCorrect) setShownCorrect(data.correctAnswer ?? correctAnswer)
    }

    // Update score in DB (fire and forget for UX speed)
    fetch('/api/flashcards/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wordId: word.id, correct: isCorrect }),
    })

    setCorrect(isCorrect)
    setAnswered(true)
    setChecking(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Question */}
      <div style={{
        textAlign: 'center', padding: '32px 24px', borderRadius: '12px',
        background: 'var(--color-bg)', border: '1px solid var(--color-card-border)',
      }}>
        {direction === 'de-en' && word.article && (
          <span style={{
            fontSize: '13px', fontWeight: 600, marginRight: '6px',
            color: getArticleColor(word.article),
          }}>
            {word.article}
          </span>
        )}
        <span style={{ fontSize: '26px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
          {question}
        </span>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
          {direction === 'de-en' ? 'German → English' : 'English → German'}
        </p>
      </div>

      {/* Answer area */}
      {mode === 'multiple-choice' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {options.map((opt, i) => {
            let bg = 'var(--color-bg)'
            let border = 'var(--color-card-border)'
            let color = 'var(--color-text-primary)'
            if (answered) {
              const isCorrectOpt = opt.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
              if (isCorrectOpt) { bg = 'var(--color-green-bg)'; border = '#86efac'; color = 'var(--color-green-text)' }
              else if (!correct) { bg = 'rgba(239,68,68,0.08)'; border = 'rgba(239,68,68,0.3)'; color = '#ef4444' }
            }
            return (
              <button
                key={i}
                onClick={() => !answered && submitAnswer(opt)}
                disabled={answered}
                style={{
                  padding: '12px 8px', borderRadius: '8px', border: `1px solid ${border}`,
                  background: bg, color, fontSize: '14px', cursor: answered ? 'default' : 'pointer',
                  fontWeight: 400, transition: 'all 0.15s',
                }}
              >
                {opt}
              </button>
            )
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            ref={inputRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !answered && inputValue.trim() && submitAnswer(inputValue.trim())}
            disabled={answered || checking}
            placeholder="Type your answer..."
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '8px',
              border: '1px solid var(--color-card-border)', background: 'var(--color-bg)',
              color: 'var(--color-text-primary)', fontSize: '15px', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {!answered && (
            <button
              onClick={() => inputValue.trim() && submitAnswer(inputValue.trim())}
              disabled={!inputValue.trim() || checking}
              style={{
                padding: '10px 0', borderRadius: '8px', border: 'none',
                background: 'var(--color-text-primary)', color: 'var(--color-bg)',
                fontSize: '14px', fontWeight: 500, cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                opacity: inputValue.trim() ? 1 : 0.4,
              }}
            >
              {checking ? 'Checking...' : 'Check'}
            </button>
          )}
        </div>
      )}

      {/* Feedback */}
      <AnimatePresence>
        {answered && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '12px 16px', borderRadius: '8px', textAlign: 'center',
              background: correct ? 'var(--color-green-bg)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${correct ? '#86efac' : 'rgba(239,68,68,0.3)'}`,
            }}
          >
            <p style={{ fontSize: '14px', fontWeight: 500, color: correct ? 'var(--color-green-text)' : '#ef4444' }}>
              {correct ? 'Correct!' : 'Wrong'}
            </p>
            {!correct && (
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Answer: <strong style={{ color: 'var(--color-text-primary)' }}>{shownCorrect || correctAnswer}</strong>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next button */}
      {answered && (
        <button
          onClick={() => onAnswer(correct)}
          style={{
            padding: '10px 0', borderRadius: '8px', border: 'none',
            background: 'var(--color-text-primary)', color: 'var(--color-bg)',
            fontSize: '14px', fontWeight: 500, cursor: 'pointer',
          }}
        >
          Next
        </button>
      )}
    </div>
  )
}
