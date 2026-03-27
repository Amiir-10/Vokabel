import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { word, translation, direction } = await req.json()

  if (!word || !translation || !direction) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: existing } = await supabase
    .from('words')
    .select('id, created_at')
    .ilike('word', word.trim())
    .eq('direction', direction)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'duplicate', existingId: existing.id, created_at: existing.created_at },
      { status: 409 }
    )
  }

  const { data, error } = await supabase
    .from('words')
    .insert({ word: word.trim(), translation, direction })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { error } = await supabase.from('words').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
