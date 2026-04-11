import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import type { Word } from '@/lib/types'

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

function weightedSample(words: Word[], n: number): Word[] {
  const pool = [...words]
  const maxScore = pool.reduce((max, w) => Math.max(max, w.score), 0)
  const result: Word[] = []

  while (result.length < n && pool.length > 0) {
    const weights = pool.map(w => maxScore - w.score + 1)
    const total = weights.reduce((sum, w) => sum + w, 0)
    let rand = Math.random() * total
    let idx = 0
    for (let i = 0; i < weights.length; i++) {
      rand -= weights[i]
      if (rand <= 0) { idx = i; break }
    }
    result.push(pool[idx])
    pool.splice(idx, 1)
  }

  return result
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase.from('words').select('*')
  if (error) return NextResponse.json({ error: 'Failed to fetch words' }, { status: 500 })

  const words: Word[] = data ?? []
  if (words.length === 0) return NextResponse.json([])

  const batch = weightedSample(words, Math.min(20, words.length))
  return NextResponse.json(batch)
}
