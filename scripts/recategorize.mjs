/**
 * Re-catégorise les transactions basse confiance et NON_CATEGORISE
 * avec Claude Opus 4.8
 * Usage: node scripts/recategorize.mjs
 */
import Anthropic from '@anthropic-ai/sdk'
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// Charger .env.local manuellement
function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    try {
      const lines = readFileSync(resolve(ROOT, file), 'utf8').split('\n')
      for (const line of lines) {
        const m = line.match(/^([^#=]+)=(.*)$/)
        if (m && !process.env[m[1].trim()]) {
          process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
        }
      }
    } catch {}
  }
}
loadEnv()

const CATEGORIES = [
  'SALAIRE','PRIME','NOTE_FRAIS','REMBOURSEMENT_COLOC','REMBOURSEMENT_DIVERS',
  'REVENU_EXCEPTIONNEL','LOGEMENT','ENERGIE','EPARGNE','CREDIT','REMBOURSEMENT_DETTE',
  'ASSURANCE','ABONNEMENT','RESTOS_BARS','ALIMENTATION','TRANSPORT','VOYAGE_SORTIES',
  'SHOPPING','SANTE','CASH_DAB','VIREMENT_INTERNE','EXCEPTIONNEL','IMPOTS','NON_CATEGORISE',
]

const PROMPT = `Tu re-catégorises des transactions bancaires de Victor Michel (Marseille, Crédit Agricole).
Catégories valides : ${CATEGORIES.join(', ')}

Règles clés :
- Seres/Seres Technologies virement >1500€ → SALAIRE | <600€ → NOTE_FRAIS | 600-1500€ → PRIME
- Oiko Gestion / SAS Oiko Gestion → LOGEMENT
- EDF → LOGEMENT | Engie/Total Énergies → ENERGIE
- Q-Park/Qpark → ABONNEMENT | SFR → ABONNEMENT | Netflix/Apple/Claude.ai → ABONNEMENT
- Lc Aqua / Vibes Fitness → ABONNEMENT (salle sport)
- Filhet-allard débit → ASSURANCE | crédit → REMBOURSEMENT_DIVERS exclure:true
- Mens.pel → EPARGNE | CRCAM prêt → CREDIT
- Wero sortant vers ami → REMBOURSEMENT_DIVERS confiance:basse
- Wero reçu → REMBOURSEMENT_DIVERS
- Domaine Camargaqua / Web M. Michel Victor / De M. Michel Philippe → VIREMENT_INTERNE exclure:true
- Luana Di Carlo crédit >600€ → REMBOURSEMENT_COLOC | ≤600€ → REMBOURSEMENT_DIVERS
- Ret DAB → CASH_DAB | Intérêts débiteurs → REMBOURSEMENT_DETTE
- Restaurants, bars, cafés, fast food → RESTOS_BARS
- Supermarchés, boulangeries → ALIMENTATION | Uber trip/Lime → TRANSPORT
- France Travail → REMBOURSEMENT_DIVERS
- Laposte → ABONNEMENT ou SHOPPING selon contexte
- IVS France → ALIMENTATION (distributeur)
- Relay → ALIMENTATION (presse/snack gare)
- Little Store → NON_CATEGORISE (inconnu)
- Virement inconnu >200€ sortant → NON_CATEGORISE confiance:basse
- Web Arthur + prénom → virement perso à identifier, NON_CATEGORISE si inconnu

Retourne UNIQUEMENT un JSON array :
[{"id":"xxx","categorie":"CAT","confiance":"haute|moyenne|basse","exclure":false}]
Un objet par transaction. Pas de texte autour.`

async function main() {
  const prisma = new PrismaClient()
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  console.log('🔍 Récupération des transactions à re-catégoriser...')
  const txs = await prisma.transaction.findMany({
    where: {
      OR: [
        { confiance: 'basse' },
        { categorie: 'NON_CATEGORISE' },
      ],
      verifie: false,  // Ne pas toucher aux transactions déjà vérifiées manuellement
    },
    select: { id: true, libelle: true, montant: true, categorie: true, confiance: true },
  })

  console.log(`📊 ${txs.length} transactions à traiter`)
  if (txs.length === 0) { await prisma.$disconnect(); return }

  // Traiter en batches de 40
  const BATCH = 40
  let updated = 0

  for (let i = 0; i < txs.length; i += BATCH) {
    const batch = txs.slice(i, i + BATCH)
    const batchNum = Math.floor(i / BATCH) + 1
    const totalBatches = Math.ceil(txs.length / BATCH)
    console.log(`\n🤖 Batch ${batchNum}/${totalBatches} (${batch.length} transactions)...`)

    const input = batch.map(t => ({
      id: t.id,
      libelle: t.libelle,
      montant: t.montant,
      categorie_actuelle: t.categorie,
    }))

    try {
      const message = await client.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 4096,
        system: PROMPT,
        messages: [{ role: 'user', content: JSON.stringify(input) }],
      })

      const raw = message.content[0].text.trim()
        .replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

      let results
      try { results = JSON.parse(raw) }
      catch {
        console.error('❌ JSON invalide pour batch', batchNum, raw.slice(0, 200))
        continue
      }

      for (const r of results) {
        if (!r.id || !CATEGORIES.includes(r.categorie)) {
          console.warn('⚠️  Résultat invalide ignoré:', r)
          continue
        }
        await prisma.transaction.update({
          where: { id: r.id },
          data: {
            categorie: r.categorie,
            confiance: r.confiance ?? 'moyenne',
            ...(r.exclure !== undefined ? { exclure: r.exclure } : {}),
          },
        })
        updated++
      }

      console.log(`✅ Batch ${batchNum} : ${results.length} mis à jour`)
    } catch (err) {
      console.error(`❌ Batch ${batchNum} échoué:`, err.message)
    }
  }

  await prisma.$disconnect()
  console.log(`\n🎉 Terminé : ${updated}/${txs.length} transactions re-catégorisées`)
}

main().catch(err => { console.error(err); process.exit(1) })
