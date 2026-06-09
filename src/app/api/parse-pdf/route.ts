import { NextRequest, NextResponse } from 'next/server'
import { extractTextFromPdf } from '@/lib/parsePdf'
import { parseReleveWithClaude, parseBulletinWithClaude } from '@/lib/claude'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('releve') as File | null
    if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })

    console.log('[parse-pdf] 1/4 extraction PDF…', file.name, file.size)
    const buffer = Buffer.from(await file.arrayBuffer())
    const text = await extractTextFromPdf(buffer)
    console.log('[parse-pdf] 2/4 texte extrait, longueur:', text.length)

    const parsed = await parseReleveWithClaude(text)
    console.log('[parse-pdf] 3/4 Claude OK — relevé n°', parsed.numero, '/', parsed.transactions.length, 'transactions')

    // Vérifier si ce relevé existe déjà
    const existing = await prisma.releve.findUnique({ where: { numero: parsed.numero } })
    if (existing) {
      return NextResponse.json({ error: `Le relevé n°${parsed.numero} est déjà importé` }, { status: 409 })
    }

    // Charger les règles de catégorisation mémorisées
    const regles = await prisma.regleCategorie.findMany()
    const reglesMap = new Map(regles.map(r => [r.pattern.toLowerCase(), r.categorie]))

    // Créer le relevé + transactions
    const releve = await prisma.releve.create({
      data: {
        numero: parsed.numero,
        periode: parsed.dateDebut.slice(0, 7),
        dateDebut: new Date(parsed.dateDebut),
        dateFin: new Date(parsed.dateFin),
        soldeDebut: parsed.soldeDebut,
        soldeFin: parsed.soldeFin,
        transactions: {
          create: parsed.transactions
            .filter(t => t.date && typeof t.montant === 'number' && t.libelle && t.categorie)
            .map(t => {
            // Appliquer les règles mémorisées
            let categorie = t.categorie
            let confiance = t.confiance
            for (const [pattern, cat] of reglesMap) {
              if (t.libelle.toLowerCase().includes(pattern)) {
                categorie = cat
                confiance = 'haute'
                break
              }
            }
            // Si Claude a mis un revenu en négatif, on corrige le signe
            const REVENUS_CATS = ['SALAIRE','PRIME','NOTE_FRAIS','REMBOURSEMENT_DIVERS','REVENU_EXCEPTIONNEL']
            const montant = REVENUS_CATS.includes(categorie) && t.montant < 0
              ? Math.abs(t.montant)
              : t.montant

            return {
              date: new Date(t.date),
              libelle: t.libelle,
              libelleRaw: t.libelle,
              montant,
              categorie,
              confiance,
              exclure: t.exclure ?? false,

            }
          }),
        },
      },
      include: { transactions: true },
    })

    // Bulletin de salaire optionnel — cross-validation
    let reconciliation: { match: boolean; netBulletin: number; netReleve: number } | null = null
    const bulletinFile = formData.get('bulletin') as File | null
    if (bulletinFile) {
      try {
        const bulletinBuffer = Buffer.from(await bulletinFile.arrayBuffer())
        const bulletinText = await extractTextFromPdf(bulletinBuffer)
        const parsedBulletin = await parseBulletinWithClaude(bulletinText)

        // Stocker le bulletin (ignorer si déjà existant)
        await prisma.bulletinSalaire.upsert({
          where: { periode: parsedBulletin.periode },
          update: { ...parsedBulletin },
          create: { ...parsedBulletin },
        })

        // Comparer net bulletin vs virement Seres reçu en banque
        const seresTx = releve.transactions.find(t =>
          t.categorie === 'SALAIRE' && t.montant > 0
        )
        if (seresTx) {
          const ecart = Math.abs(seresTx.montant - parsedBulletin.netVerse)

          reconciliation = {
            match: ecart < 50,
            netBulletin: parsedBulletin.netVerse,

            netReleve: seresTx.montant,
          }
        }
        console.log('[parse-pdf] bulletin cross-validé — période:', parsedBulletin.periode, '| réconciliation:', reconciliation)
      } catch (bulletinErr) {
        console.warn('[parse-pdf] échec parse bulletin (non bloquant):', bulletinErr)
      }
    }

    return NextResponse.json({ success: true, releve, reconciliation })
  } catch (err) {
    console.error('[parse-pdf]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
