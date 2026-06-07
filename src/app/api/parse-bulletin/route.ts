import { NextRequest, NextResponse } from 'next/server'
import { extractTextFromPdf } from '@/lib/parsePdf'
import { parseBulletinWithClaude } from '@/lib/claude'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('bulletin') as File | null
    if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const text = await extractTextFromPdf(buffer)
    const parsed = await parseBulletinWithClaude(text)

    const existing = await prisma.bulletinSalaire.findUnique({ where: { periode: parsed.periode } })
    if (existing) {
      return NextResponse.json({ error: `Bulletin ${parsed.periode} déjà importé` }, { status: 409 })
    }

    const bulletin = await prisma.bulletinSalaire.create({ data: parsed })
    return NextResponse.json({ success: true, bulletin })
  } catch (err) {
    console.error('[parse-bulletin]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
