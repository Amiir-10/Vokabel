import { NextRequest, NextResponse } from 'next/server'

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

function parseGender(wikitext: string): 'der' | 'die' | 'das' | null {
  if (!wikitext.includes('Substantiv')) return null

  const genusMatch = wikitext.match(/Genus\s*\d?\s*=\s*([mfn])/i)
  if (!genusMatch) return null

  switch (genusMatch[1].toLowerCase()) {
    case 'm': return 'der'
    case 'f': return 'die'
    case 'n': return 'das'
    default: return null
  }
}

async function lookupWord(word: string): Promise<'der' | 'die' | 'das' | null> {
  const capitalized = word.charAt(0).toUpperCase() + word.slice(1)
  const url = `https://de.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(capitalized)}&prop=wikitext&format=json`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!response.ok) return null
    const data = await response.json()
    const wikitext: string = data?.parse?.wikitext?.['*'] ?? ''
    return parseGender(wikitext)
  } catch {
    clearTimeout(timeout)
    return null
  }
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

  // Try the full phrase first
  let article = await lookupWord(cleaned)

  // For multi-word phrases, fall back to the last word (main noun in German)
  if (!article && cleaned.includes(' ')) {
    const words = cleaned.split(/\s+/).filter(Boolean)
    const lastWord = words[words.length - 1]
    article = await lookupWord(lastWord)
  }

  return NextResponse.json({ article })
}
