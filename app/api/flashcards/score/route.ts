import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'

const rateLimit = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60_000
const RATE_LIMIT_MAX = 60

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

  const { wordId, correct } = await req.json()
  if (!wordId || typeof correct !== 'boolean') {
    return NextResponse.json({ error: 'wordId and correct are required' }, { status: 400 })
  }

  const supabase = await createServerClient()
  const { data: existing, error: fetchError } = await supabase
    .from('words')
    .select('score')
    .eq('id', wordId)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Word not found' }, { status: 404 })
  }

  const newScore = existing.score + (correct ? 1 : -2)
  const { error: updateError } = await supabase
    .from('words')
    .update({ score: newScore, last_reviewed: new Date().toISOString() })
    .eq('id', wordId)

  if (updateError) return NextResponse.json({ error: 'Failed to update score' }, { status: 500 })

  return NextResponse.json({ score: newScore })
}
