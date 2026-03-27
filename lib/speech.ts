import type { Direction } from './types'

export function speak(text: string, lang: 'de-DE' | 'en-US') {
  if (!text.trim() || typeof window === 'undefined') return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text.trim())
  utterance.lang = lang
  utterance.rate = 0.9
  window.speechSynthesis.speak(utterance)
  return utterance
}

export function getLangCode(direction: Direction, position: 'source' | 'target'): 'de-DE' | 'en-US' {
  if (direction === 'de-en') return position === 'source' ? 'de-DE' : 'en-US'
  return position === 'source' ? 'en-US' : 'de-DE'
}
