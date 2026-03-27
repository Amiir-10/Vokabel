'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import TranslateBox from '@/components/TranslateBox'
import VocabTable from '@/components/VocabTable'
import ThemeToggle from '@/components/ThemeToggle'
import { useTheme } from '@/hooks/useTheme'
import type { Word } from '@/lib/types'

export default function Home() {
  const { theme, toggleTheme } = useTheme()
  const [words, setWords] = useState<Word[]>([])
  const [newWordId, setNewWordId] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/words')
      .then(r => r.json())
      .then(setWords)
  }, [])

  const handleWordSaved = (word: Word) => {
    setWords(prev => [word, ...prev])
    setNewWordId(word.id)
    setTimeout(() => setNewWordId(null), 5000)
  }

  const handleDelete = async (id: string) => {
    setWords(prev => prev.filter(w => w.id !== id))
    const res = await fetch('/api/words', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) {
      fetch('/api/words').then(r => r.json()).then(setWords)
    }
  }

  const handleJumpToWord = useCallback((id: string) => {
    const el = document.getElementById(`word-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightId(id)
      setTimeout(() => setHighlightId(null), 2000)
    }
  }, [])

  return (
    <main style={{ maxWidth: '680px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Vokabel
          </p>
          <h1 style={{ fontSize: '22px', fontWeight: 500 }}>Your German vocabulary</h1>
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      <TranslateBox
        onWordSaved={handleWordSaved}
        existingWords={words}
        onJumpToWord={handleJumpToWord}
      />

      <div ref={tableRef}>
        <VocabTable
          words={words}
          onDelete={handleDelete}
          newWordId={newWordId}
          highlightId={highlightId}
        />
      </div>
    </main>
  )
}
