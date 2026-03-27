import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { word, direction } = await req.json()

  if (!word || word.trim() === '') {
    return NextResponse.json({ error: 'Word is required' }, { status: 400 })
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
