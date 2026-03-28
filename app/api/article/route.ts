import { NextRequest, NextResponse } from 'next/server'
import type { Article } from '@/lib/types'

const rateLimit = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60_000
const RATE_LIMIT_MAX = 30

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimit.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

function stripArticle(word: string): string {
  return word.replace(/^(der|die|das|ein|eine|einen|einem|eines|einer)\s+/i, '').trim()
}

function isPluralForm(wikitext: string): boolean {
  return wikitext.includes('Deklinierte Form') && /Plural/.test(wikitext)
}

function parseGender(wikitext: string): 'der' | 'die' | 'das' | null {
  if (!wikitext.includes('Substantiv')) return null

  const genusMatch = wikitext.match(/Genus\s*\d?\s*=\s*([mfn])/i)
  if (genusMatch) {
    switch (genusMatch[1].toLowerCase()) {
      case 'm': return 'der'
      case 'f': return 'die'
      case 'n': return 'das'
    }
  }

  // Fallback: check heading markers like {{Wortart|Substantiv|Deutsch}}, {{f}}
  const headingMatch = wikitext.match(/\{\{Wortart\|Substantiv\|Deutsch\}\}.*?\{\{([mfn])\}\}/i)
  if (headingMatch) {
    switch (headingMatch[1].toLowerCase()) {
      case 'm': return 'der'
      case 'f': return 'die'
      case 'n': return 'das'
    }
  }

  return null
}

async function fetchWikitext(word: string): Promise<string | null> {
  const capitalized = word.charAt(0).toUpperCase() + word.slice(1)
  const url = `https://de.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(capitalized)}&prop=wikitext&format=json`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!response.ok) return null
    const data = await response.json()
    return data?.parse?.wikitext?.['*'] ?? null
  } catch {
    clearTimeout(timeout)
    return null
  }
}

async function lookupWord(word: string): Promise<Article> {
  const wikitext = await fetchWikitext(word)
  if (wikitext) {
    if (isPluralForm(wikitext)) return 'die (Pl.)'
    const gender = parseGender(wikitext)
    if (gender) return gender
  }

  // Compound word decomposition: try suffixes to find the base noun
  // German gender is determined by the last component (e.g., Klimagerät → Gerät)
  if (word.length > 5) {
    const mid = Math.ceil(word.length / 3)
    for (let i = mid; i <= word.length - 3; i++) {
      const suffix = word.slice(i)
      const suffixWikitext = await fetchWikitext(suffix)
      if (suffixWikitext && suffixWikitext.includes('Substantiv')) {
        if (isPluralForm(suffixWikitext)) return 'die (Pl.)'
        const gender = parseGender(suffixWikitext)
        if (gender) return gender
      }
    }
  }

  return null
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ article: null }, { status: 429 })
  }

  const { word } = await req.json()

  if (!word || word.trim() === '') {
    return NextResponse.json({ article: null })
  }

  const cleaned = stripArticle(word.trim())
  const wordCount = cleaned.split(/\s+/).filter(Boolean).length

  // Skip article detection for sentences (3+ words)
  if (wordCount >= 3) {
    return NextResponse.json({ article: null })
  }

  // Try the full phrase first
  let article = await lookupWord(cleaned)

  // For two-word phrases, fall back to the last word (main noun in German)
  if (!article && wordCount === 2) {
    const words = cleaned.split(/\s+/).filter(Boolean)
    const lastWord = words[words.length - 1]
    article = await lookupWord(lastWord)
  }

  return NextResponse.json({ article })
}
