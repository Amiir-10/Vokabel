import { NextRequest, NextResponse } from 'next/server'
import { similarity, SIMILARITY_THRESHOLD } from '@/lib/levenshtein'
import type { QuizDirection } from '@/lib/types'

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

async function translateViaDeepL(text: string, sourceLang: string, targetLang: string): Promise<string | null> {
  const res = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: [text], source_lang: sourceLang, target_lang: targetLang }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.translations?.[0]?.text ?? null
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { userAnswer, correctAnswer, originalWord, direction } = await req.json() as {
    userAnswer: string
    correctAnswer: string
    originalWord: string
    direction: QuizDirection
  }

  if (!userAnswer || !correctAnswer || !originalWord || !direction) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const normalizedUser = userAnswer.trim().toLowerCase()
  const normalizedCorrect = correctAnswer.trim().toLowerCase()

  // Exact match
  if (normalizedUser === normalizedCorrect) {
    return NextResponse.json({ correct: true, method: 'exact' })
  }

  // Fuzzy match
  const sim = similarity(normalizedUser, normalizedCorrect)
  if (sim >= SIMILARITY_THRESHOLD) {
    return NextResponse.json({ correct: true, method: 'fuzzy', similarity: sim })
  }

  // DeepL round-trip: translate user's answer back to the question language
  // direction 'de-en' means question is German, answer is English -> translate EN->DE and compare with originalWord
  // direction 'en-de' means question is English, answer is German -> translate DE->EN and compare with originalWord
  const [sourceLang, targetLang] = direction === 'de-en' ? ['EN', 'DE'] : ['DE', 'EN-GB']
  const roundTrip = await translateViaDeepL(userAnswer.trim(), sourceLang, targetLang)

  if (roundTrip) {
    const normalizedRoundTrip = roundTrip.trim().toLowerCase()
    const normalizedOriginal = originalWord.trim().toLowerCase()
    if (normalizedRoundTrip === normalizedOriginal || similarity(normalizedRoundTrip, normalizedOriginal) >= SIMILARITY_THRESHOLD) {
      return NextResponse.json({ correct: true, method: 'deepl-roundtrip' })
    }
  }

  return NextResponse.json({ correct: false, correctAnswer })
}
