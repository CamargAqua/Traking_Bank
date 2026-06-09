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
    console.log('[parse-bulletin] parsed:', parsed)

    const bulletin = await prisma.bulletinSalaire.upsert({
      where: { periode: parsed.periode },
      update: {
        salaireBrutFixe: parsed.salaireBrutFixe,
        salaireBrutVar:  parsed.salaireBrutVar,
        cotisations:     parsed.cotisations,
        netVerse:        parsed.netVerse,
      },
      create: parsed,
    })

    // Trouver le relevé du même mois pour cross-validation et redirection
    const releve = await prisma.releve.findFirst({
      where: { periode: parsed.periode },
      include: { transactions: true },
    })

    let reconciliation: { match: boolean; netBulletin: number; netReleve: number } | null = null
    if (releve) {
      const seresTx = releve.transactions.find(t => t.categorie === 'SALAIRE' && t.montant > 0)
      if (seresTx) {
        const ecart = Math.abs(seresTx.montant - parsed.netVerse)
        reconciliation = { match: ecart < 50, netBulletin: parsed.netVerse, netReleve: seresTx.montant }
      }
    }

    return NextResponse.json({ success: true, bulletin, releve, reconciliation })
  } catch (err) {
    console.error('[parse-bulletin]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
