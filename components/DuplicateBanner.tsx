'use client'
import { motion } from 'framer-motion'

interface Props {
  savedOn: string
  onJump: () => void
}

export default function DuplicateBanner({ savedOn, onJump }: Props) {
  const date = new Date(savedOn).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 16px',
        background: 'var(--color-amber-bg)',
        borderTop: '0.5px solid var(--color-amber-border)',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#854F0B" strokeWidth="1.5" style={{ flexShrink: 0 }}>
        <circle cx="8" cy="8" r="6.5"/>
        <path d="M8 5v3.5M8 11v.5"/>
      </svg>
      <span style={{ fontSize: '13px', color: 'var(--color-amber-text)', flex: 1 }}>
        Already in your vocabulary, saved on {date}
      </span>
      <button
        onClick={onJump}
        style={{
          fontSize: '13px',
          fontWeight: 500,
          color: '#854F0B',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textDecoration: 'underline',
          whiteSpace: 'nowrap',
        }}
      >
        Jump to it &darr;
      </button>
    </motion.div>
  )
}
