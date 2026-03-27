import { NextRequest, NextResponse } from 'next/server'

const rateLimit = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60_000 // 1 minute
const RATE_LIMIT_MAX = 30 // max 30 requests per minute
const MAX_WORD_LENGTH = 100

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

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { word, direction } = await req.json()

  if (!word || word.trim() === '') {
    return NextResponse.json({ error: 'Word is required' }, { status: 400 })
  }

  if (word.trim().length > MAX_WORD_LENGTH) {
    return NextResponse.json({ error: 'Word is too long' }, { status: 400 })
  }

  const [sourceLang, targetLang] = direction === 'de-en'
    ? ['DE', 'EN-GB']
    : ['EN', 'DE']

  const response = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: [word.trim()],
      source_lang: sourceLang,
      target_lang: targetLang,
    }),
  })

  if (!response.ok) {
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
  }

  const data = await response.json()
  const translation = data.translations?.[0]?.text ?? ''

  return NextResponse.json({ translation })
}
