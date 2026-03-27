import { NextRequest, NextResponse } from 'next/server'

const rateLimit = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60_000
const RATE_LIMIT_MAX = 30
const MAX_TEXT_LENGTH = 100

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

  const { text, language } = await req.json()

  if (!text || text.trim() === '') {
    return NextResponse.json({ suggestions: [] })
  }

  if (text.trim().length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: 'Text is too long' }, { status: 400 })
  }

  const langCode = language === 'de' ? 'de-DE' : 'en-US'

  const params = new URLSearchParams({
    text: text.trim(),
    language: langCode,
    enabledOnly: 'false',
  })

  const response = await fetch('https://api.languagetool.org/v2/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!response.ok) {
    return NextResponse.json({ suggestions: [] })
  }

  const data = await response.json()

  const suggestions = (data.matches ?? [])
    .filter((m: { replacements?: { value: string }[] }) => m.replacements && m.replacements.length > 0)
    .map((m: { offset: number; length: number; replacements: { value: string }[]; message: string }) => ({
      original: text.trim().slice(m.offset, m.offset + m.length),
      replacement: m.replacements[0].value,
    }))

  return NextResponse.json({ suggestions })
}
