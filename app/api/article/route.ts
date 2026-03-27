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
  return word.replace(/^(der|die|das)\s+/i, '')
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
  const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)

  const url = `https://de.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(capitalized)}&prop=wikitext&format=json`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    if (!response.ok) {
      return NextResponse.json({ article: null })
    }

    const data = await response.json()
    const wikitext: string = data?.parse?.wikitext?.['*'] ?? ''

    const article = parseGender(wikitext)
    return NextResponse.json({ article })
  } catch {
    return NextResponse.json({ article: null })
  }
}
