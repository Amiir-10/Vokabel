export type Direction = 'de-en' | 'en-de'

export interface Word {
  id: string
  word: string
  translation: string
  direction: Direction
  created_at: string
}
