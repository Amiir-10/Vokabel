export type Direction = 'de-en' | 'en-de'

export type Article = 'der' | 'die' | 'das' | 'die (Pl.)' | null

export interface Word {
  id: string
  user_id: string
  word: string
  translation: string
  direction: Direction
  created_at: string
  article: Article
  score: number
  last_reviewed: string | null
}

export type QuizDirection = 'de-en' | 'en-de'
export type AnswerMode = 'multiple-choice' | 'free-text'

export function normalizeWord(w: Word): { german: string; english: string; article: Article } {
  if (w.direction === 'de-en') {
    return { german: w.word, english: w.translation, article: w.article }
  }
  return { german: w.translation, english: w.word, article: w.article }
}

export function getArticleColor(article: Article): string {
  switch (article) {
    case 'der': return 'var(--color-article-der)'
    case 'das': return 'var(--color-article-das)'
    case 'die': return 'var(--color-article-die)'
    case 'die (Pl.)': return 'var(--color-article-die-pl)'
    default: return 'transparent'
  }
}
