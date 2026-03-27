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

const empty = { german: null, english: null }

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json(empty, { status: 429 })
  }

  const { word } = await req.json()

  if (!word || word.trim() === '') {
    return NextResponse.json(empty)
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const url = `https://tatoeba.org/api_v0/search?from=deu&to=eng&query=${encodeURIComponent(word.trim())}&limit=5`
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    if (!response.ok) {
      return NextResponse.json(empty)
    }

    const data = await response.json()
    const results = data?.results ?? []

    const pattern = new RegExp(`\\b${word.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')

    for (const result of results) {
      if (!pattern.test(result.text)) continue

      const translations = result.translations?.[0]
      if (!translations || translations.length === 0) continue

      const englishTranslation = translations[0]?.text
      if (!englishTranslation) continue

      return NextResponse.json({
        german: result.text,
        english: englishTranslation,
      })
    }

    return NextResponse.json(empty)
  } catch {
    return NextResponse.json(empty)
  }
}
