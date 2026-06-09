/**
 * Corrige les catégories et déduplique les charges récurrentes dans les relevés existants.
 * - Q-Park LOGEMENT → ABONNEMENT
 * - EDF ENERGIE → LOGEMENT
 * - Doublons Oiko / Q-Park dans un même relevé → exclure le plus ancien
 * Usage : npx tsx scripts/fix-categories.ts
 */
import { config } from 'dotenv'
config()

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 1. Q-Park LOGEMENT → ABONNEMENT
  const qpark = await prisma.transaction.updateMany({
    where: { libelle: { contains: 'Q-park',  }, categorie: 'LOGEMENT' },
    data: { categorie: 'ABONNEMENT' },
  })
  console.log(`Q-Park → ABONNEMENT : ${qpark.count} transaction(s)`)

  // 2. EDF ENERGIE → LOGEMENT
  const edf = await prisma.transaction.updateMany({
    where: {
      OR: [
        { libelle: { contains: 'Electricite De France',  } },
        { libelle: { contains: 'EDF',  } },
      ],
      categorie: 'ENERGIE',
    },
    data: { categorie: 'LOGEMENT' },
  })
  console.log(`EDF → LOGEMENT : ${edf.count} transaction(s)`)

  // 3. Dédupliquer les charges récurrentes par relevé
  // Pour chaque relevé, si même libellé + même montant dans LOGEMENT ou ABONNEMENT apparaît 2 fois,
  // marquer l'occurrence la plus ancienne comme exclure=true
  const CHARGES_RECURRENTES = ['LOGEMENT', 'ABONNEMENT']
  const releves = await prisma.releve.findMany({
    include: {
      transactions: {
        where: { categorie: { in: CHARGES_RECURRENTES } },
        orderBy: { date: 'asc' },
      },
    },
  })

  let dedupCount = 0
  for (const releve of releves) {
    const seen = new Map<string, string>() // key → id de la transaction la plus récente
    const toExclude: string[] = []

    for (const tx of releve.transactions) {
      const key = `${tx.libelle.toLowerCase()}|${tx.montant}`
      if (seen.has(key)) {
        // La courante est plus récente (orderBy asc) → exclure l'ancienne
        toExclude.push(seen.get(key)!)
        seen.set(key, tx.id)
      } else {
        seen.set(key, tx.id)
      }
    }

    if (toExclude.length > 0) {
      await prisma.transaction.updateMany({
        where: { id: { in: toExclude } },
        data: { exclure: true },
      })
      dedupCount += toExclude.length
      console.log(`Relevé n°${releve.numero} : ${toExclude.length} doublon(s) exclu(s)`)
    }
  }
  console.log(`Déduplication : ${dedupCount} transaction(s) marquées exclure=true au total`)

  // 4. Luana — virements reçus > 600€ → REMBOURSEMENT_COLOC, exclure=false
  const luanaGros = await prisma.transaction.updateMany({
    where: {
      libelle: { contains: 'Luana' },
      montant: { gt: 600 },
    },
    data: { categorie: 'REMBOURSEMENT_COLOC', exclure: false },
  })
  console.log(`Luana >600€ → REMBOURSEMENT_COLOC visible : ${luanaGros.count} transaction(s)`)

  // 5. Luana — virements reçus ≤ 600€ → REMBOURSEMENT_DIVERS, exclure=false
  const luanaPetit = await prisma.transaction.updateMany({
    where: {
      libelle: { contains: 'Luana' },
      montant: { gt: 0, lte: 600 },
    },
    data: { categorie: 'REMBOURSEMENT_DIVERS', exclure: false },
  })
  console.log(`Luana ≤600€ reçus → REMBOURSEMENT_DIVERS visible : ${luanaPetit.count} transaction(s)`)

  // 6. Wero envoyés à Luana (montant négatif) → REMBOURSEMENT_DIVERS, exclure=false
  const luanaEnvoye = await prisma.transaction.updateMany({
    where: {
      libelle: { contains: 'Luana' },
      montant: { lt: 0 },
    },
    data: { categorie: 'REMBOURSEMENT_DIVERS', exclure: false },
  })
  console.log(`Luana envoyés → REMBOURSEMENT_DIVERS visible : ${luanaEnvoye.count} transaction(s)`)

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
