'use client'
import { motion, AnimatePresence } from 'framer-motion'

interface Suggestion {
  original: string
  replacement: string
  offset: number
  length: number
}

interface Props {
  suggestions: Suggestion[]
  input: string
  onApply: (corrected: string) => void
}

export default function SpellSuggestion({ suggestions, input, onApply }: Props) {
  if (suggestions.length === 0) return null

  const s = suggestions[0]
  const corrected = input.slice(0, s.offset) + s.replacement + input.slice(s.offset + s.length)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        style={{ overflow: 'hidden' }}
      >
        <div style={{
          padding: '8px 16px',
          fontSize: '13px',
          color: 'var(--color-amber-text)',
          background: 'var(--color-amber-bg)',
          borderTop: '0.5px solid var(--color-amber-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0 }}>
            <path d="M12 5l-6.5 6.5L2 8" />
          </svg>
          <span>Did you mean{' '}
            <button
              onClick={() => onApply(corrected)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                color: 'var(--color-amber-text)',
                textDecoration: 'underline',
                fontSize: '13px',
                fontFamily: 'inherit',
                padding: 0,
              }}
            >
              {corrected}
            </button>?
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
