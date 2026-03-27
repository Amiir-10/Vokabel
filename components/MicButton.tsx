'use client'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

interface Props {
  lang: 'de-DE' | 'en-US'
  onResult: (text: string) => void
}

export default function MicButton({ lang, onResult }: Props) {
  const { isListening, startListening, stopListening, isSupported } = useSpeechRecognition(lang, onResult)

  if (!isSupported) return null

  return (
    <>
      <button
        onClick={isListening ? stopListening : startListening}
        aria-label={isListening ? 'Stop recording' : 'Start voice input'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          borderRadius: '4px',
          padding: 0,
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {isListening && (
          <span className="mic-pulse" style={{
            position: 'absolute',
            inset: -2,
            borderRadius: '50%',
            border: '2px solid #EF4444',
            opacity: 0.6,
          }} />
        )}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke={isListening ? '#EF4444' : 'var(--color-text-muted)'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="5.5" y="1.5" width="5" height="8" rx="2.5" />
          <path d="M3 7.5a5 5 0 0 0 10 0" />
          <path d="M8 12.5v2" />
        </svg>
      </button>
      {isListening && (
        <style>{`@keyframes mic-pulse-anim { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.3); opacity: 0; } } .mic-pulse { animation: mic-pulse-anim 1.2s ease-in-out infinite; }`}</style>
      )}
    </>
  )
}
