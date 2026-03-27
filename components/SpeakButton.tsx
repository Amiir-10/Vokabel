'use client'
import { useState, useCallback } from 'react'
import { speak } from '@/lib/speech'

interface Props {
  text: string
  lang: 'de-DE' | 'en-US'
  size?: number
}

export default function SpeakButton({ text, lang, size = 16 }: Props) {
  const [speaking, setSpeaking] = useState(false)

  const handleClick = useCallback(() => {
    const utterance = speak(text, lang)
    if (!utterance) return
    setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
  }, [text, lang])

  return (
    <button
      onClick={handleClick}
      aria-label={`Listen to "${text}"`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size + 8,
        height: size + 8,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        borderRadius: '4px',
        padding: 0,
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        stroke={speaking ? 'var(--color-green-text)' : 'var(--color-text-muted)'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 5.5h1.5L8 2.5v11l-3.5-3H3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z" />
        <path d="M10.5 5.5a3 3 0 0 1 0 5" />
        <path d="M12.5 3.5a6 6 0 0 1 0 9" />
      </svg>
    </button>
  )
}
