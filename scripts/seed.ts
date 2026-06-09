/**
 * Seed — importe tous les relevés PDF depuis le dossier Downloads
 * Usage : npx tsx scripts/seed.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import Anthropic from '@anthropic-ai/sdk'

// ──────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────
const DOWNLOADS = path.join(process.env.USERPROFILE ?? process.env.HOME ?? '', 'Downloads')

const PDF_FILES = [
  'Releve n001 du 02-01-2026-CCHQ 92605265000 M MICHEL VICTOR.pdf',
  'Releve n002 du 04-02-2026-CCHQ 92605265000 M MICHEL VICTOR.pdf',
  'Releve n003 du 04-03-2026-CCHQ 92605265000 M MICHEL VICTOR.pdf',
  'Releve n004 du 03-04-2026-CCHQ 92605265000 M MICHEL VICTOR.pdf',
  'Releve n005 du 04-05-2026-CCHQ 92605265000 M MICHEL VICTOR.pdf',
  'Releve n006 du 04-06-2026-CCHQ 92605265000 M MICHEL VICTOR.pdf',
]

// ──────────────────────────────────────────────
// Deps (dynamic require pour éviter les types ESM)
// ──────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>

const prisma = new PrismaClient()
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ──────────────────────────────────────────────
// Prompt Claude (identique à lib/claude.ts)
// ──────────────────────────────────────────────
const SYSTEM_PROMPT = `Tu analyses des relevés bancaires Crédit Agricole pour Victor Michel (Marseille).
Catégories : SALAIRE,PRIME,NOTE_FRAIS,REMBOURSEMENT_COLOC,REMBOURSEMENT_DIVERS,REVENU_EXCEPTIONNEL,LOGEMENT,EPARGNE,REMBOURSEMENT_DETTE,ASSURANCE,ABONNEMENT,RESTOS_BARS,ALIMENTATION,TRANSPORT,VOYAGE_SORTIES,SHOPPING,SANTE,CASH_DAB,VIREMENT_INTERNE,EXCEPTIONNEL,IMPOTS,NON_CATEGORISE

FORMAT CA : deux sections — COMPTE COURANT (débit/crédit) + CARTE (tout en débit).
"Prlv Dépenses Carte X9768" → IGNORER.
PIÈGE montants carte : "Marseille 1 29,35" → montant = -29.35 (le 1 = arrondissement).

REVENUS (positifs) :
- Seres >1500€ → SALAIRE | Seres <600€ libellé NSRS → NOTE_FRAIS | Seres 600-1500€ → PRIME
- Filhet-allard crédit → REMBOURSEMENT_DIVERS | France Travail → REMBOURSEMENT_DIVERS
- Rem Chq / Avoir Carte → REMBOURSEMENT_DIVERS

EXCLURE (exclure:true) :
- Luana Di Carlo / Luana D (tous sens) → REMBOURSEMENT_COLOC
- Web M. Michel Victor / De M. Michel Victor → VIREMENT_INTERNE
- De M. Michel Philippe → VIREMENT_INTERNE

LOGEMENT : Oiko Gestion (1085€/mois), EDF, Q-park
ASSURANCE : Filhet-allard débit, Gp Assurance Fnac
ABONNEMENT : SFR, Vibes Fitness/Aqua, Fnac Darty, Netflix, Apple, Ionos, Uber One, Offre Premium
ÉPARGNE : Mens.pel / PEL (~45€)
REMBOURSEMENT_DETTE : CRCAM prêt, Intérets débiteurs
TRANSPORT : Lime, Uber trip, ASF/Autoroutes, Navigo, TFL, Voi, essence, Areas
RESTOS_BARS : restaurants, bars, cafés, fast food
ALIMENTATION : supermarchés, boulangeries, boucheries, caves à vins, Prim'logistique
SANTE : Doctolib, dentiste, pharmacie (Phie)
SHOPPING : Amazon, Decathlon, Norauto, Leboncoin, Maisons du Monde
IMPOTS : DGFiP / Direction Générale Finances
CASH_DAB : Ret DAB
NON_CATEGORISE : tout inconnu, confiance:basse

Compact, libellés ≤40 chars. JSON UNIQUEMENT :
{"numero":1,"dateDebut":"2025-12-04","dateFin":"2026-01-02","soldeDebut":309.52,"soldeFin":1714.87,"transactions":[{"date":"YYYY-MM-DD","libelle":"Libellé court","montant":-123.45,"categorie":"CATEGORIE","confiance":"haute","exclure":false}]}`

interface TransactionRaw {
  date: string
  libelle: string
  montant: number
  categorie: string
  confiance: string
  exclure: boolean
}

interface ReleveInfo {
  numero: number
  dateDebut: string
  dateFin: string
  soldeDebut: number
  soldeFin: number
  transactions: TransactionRaw[]
}

function repairJson(raw: string): string {
  let s = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  const m = s.match(/\{[\s\S]*/)
  if (!m) throw new Error('Pas de JSON')
  s = m[0].replace(/,\s*([}\]])/g, '$1')
  let braces = 0, brackets = 0, inStr = false, esc = false
  for (const ch of s) {
    if (esc) { esc = false; continue }
    if (ch === '\\' && inStr) { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '{') braces++
    else if (ch === '}') braces--
    else if (ch === '[') brackets++
    else if (ch === ']') brackets--
  }
  while (brackets > 0) { s += ']'; brackets-- }
  while (braces > 0) { s += '}'; braces-- }
  return s
}

async function importReleve(filePath: string): Promise<void> {
  const fileName = path.basename(filePath)
  console.log(`\n📄 ${fileName}`)

  const buffer = fs.readFileSync(filePath)
  const { text } = await pdfParse(buffer)
  console.log(`   ✓ PDF lu (${text.length} chars)`)

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Voici le texte d'un relevé Crédit Agricole. Retourne le JSON.\n\n${text.slice(0, 60000)}`,
    }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text
  const parsed: ReleveInfo = JSON.parse(repairJson(raw))
  console.log(`   ✓ Claude OK — relevé n°${parsed.numero} / ${parsed.transactions.length} transactions`)

  // Skip si déjà importé
  const existing = await prisma.releve.findUnique({ where: { numero: parsed.numero } })
  if (existing) {
    console.log(`   ⏭  Relevé n°${parsed.numero} déjà en base, ignoré.`)
    return
  }

  await prisma.releve.create({
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
          const REVENUS_CATS = ['SALAIRE','PRIME','NOTE_FRAIS','REVENU_EXCEPTIONNEL']
          const montant = REVENUS_CATS.includes(t.categorie) && t.montant < 0
            ? Math.abs(t.montant)
            : t.montant
          return {
            date: new Date(t.date),
            libelle: t.libelle,
            libelleRaw: t.libelle,
            montant,
            categorie: t.categorie,
            confiance: t.confiance,
            exclure: t.exclure ?? false,
          }
        }),
      },
    },
  })

  console.log(`   ✅ Sauvegardé en base.`)
}

async function main() {
  console.log('🚀 Seed — import des relevés Crédit Agricole')
  console.log(`   Dossier : ${DOWNLOADS}\n`)

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY manquante dans .env.local')
    process.exit(1)
  }

  let ok = 0, skip = 0, fail = 0

  for (const file of PDF_FILES) {
    const fullPath = path.join(DOWNLOADS, file)
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️  Fichier introuvable : ${file}`)
      fail++
      continue
    }
    try {
      await importReleve(fullPath)
      ok++
    } catch (e) {
      console.error(`❌ Erreur sur ${file}:`, e)
      fail++
    }
    // Petite pause pour ne pas surcharger l'API
    await new Promise(r => setTimeout(r, 800))
  }

  console.log(`\n✨ Terminé — ${ok} importés, ${skip} ignorés, ${fail} erreurs`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
