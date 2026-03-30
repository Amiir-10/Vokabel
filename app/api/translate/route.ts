import { NextRequest, NextResponse } from 'next/server'
import type { Article } from '@/lib/types'

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

function extractArticle(text: string): Article {
  const match = text.match(/^(der|die|das)\s+/i)
  if (!match) return null
  return match[1].toLowerCase() as 'der' | 'die' | 'das'
}

async function callDeepL(text: string[], sourceLang: string, targetLang: string) {
  const res = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, source_lang: sourceLang, target_lang: targetLang }),
  })
  if (!res.ok) return null
  return res.json()
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

  const trimmed = word.trim()

  if (trimmed.length > MAX_WORD_LENGTH) {
    return NextResponse.json({ error: 'Word is too long' }, { status: 400 })
  }

  const wordCount = trimmed.split(/\s+/).length
  const shouldDetectArticle = wordCount <= 2

  if (direction === 'en-de') {
    // EN->DE: batch both translation and article detection in one call
    const texts = shouldDetectArticle ? [trimmed, 'the ' + trimmed] : [trimmed]
    const data = await callDeepL(texts, 'EN', 'DE')
    if (!data) return NextResponse.json({ error: 'Translation failed' }, { status: 500 })

    const translation = data.translations?.[0]?.text ?? ''
    let article: Article = null
    if (shouldDetectArticle && data.translations?.[1]?.text) {
      article = extractArticle(data.translations[1].text)
    }

    return NextResponse.json({ translation, article })
  } else {
    // DE->EN: translate first, then detect article via reverse lookup
    const data = await callDeepL([trimmed], 'DE', 'EN-GB')
    if (!data) return NextResponse.json({ error: 'Translation failed' }, { status: 500 })

    const translation = data.translations?.[0]?.text ?? ''
    let article: Article = null

    if (shouldDetectArticle && translation) {
      const articleData = await callDeepL(['the ' + translation], 'EN', 'DE')
      if (articleData?.translations?.[0]?.text) {
        article = extractArticle(articleData.translations[0].text)
      }
    }

    return NextResponse.json({ translation, article })
  }
}
