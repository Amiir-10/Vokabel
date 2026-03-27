export type Direction = 'de-en' | 'en-de'

export type Article = 'der' | 'die' | 'das' | 'die (Pl.)' | null

export interface Word {
  id: string
  word: string
  translation: string
  direction: Direction
  created_at: string
  article: Article
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
