import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { jsonrepair } from 'jsonrepair'
import { prisma } from '@/lib/db'
import { CHARGES_FIXES, BUDGET_CATEGORIES } from '@/lib/categories'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const VARIABLE_INCOME_CATS = ['PRIME', 'NOTE_FRAIS', 'REVENU_EXCEPTIONNEL']

function buildPrompt(monthlyData: object[], horizon: number): string {
  const allocationByHorizon =
    horizon <= 5
      ? { etf: 50, bonds: 40, satellite: 10, label: 'court terme (≤5 ans)' }
      : horizon <= 10
        ? { etf: 65, bonds: 25, satellite: 10, label: 'moyen terme (10 ans)' }
        : { etf: 80, bonds: 10, satellite: 10, label: 'long terme (≥20 ans)' }

  return `Tu es un conseiller financier indépendant (fee-only), expert en gestion de patrimoine personnel et en investissement passif long terme (ETF, DCA). Tu raisonnes comme un planificateur financier certifié (CFP) appliquant les standards de la finance comportementale : règle 50/30/20, marge de sécurité comportementale, distinction flux stables vs irréguliers. Profil du client : équilibré/dynamique, matelas de sécurité déjà constitué, ETF world/S&P500 comme véhicule principal, accepte la volatilité. Contexte France : véhicule principal recommandé = PEA.

Voici les données financières du client mois par mois (en €) :
${JSON.stringify(monthlyData, null, 2)}

Horizon d'investissement déclaré : ${horizon} ans (${allocationByHorizon.label})
Allocation cible adaptée : ETF World ${allocationByHorizon.etf}% / Fonds euros-obligations ${allocationByHorizon.bonds}% / Satellite thématique ${allocationByHorizon.satellite}%

---

APPROCHE — raisonne dans cet ordre :

1. Calcule le flux_libre de chaque mois = salaire − charges_fixes − depenses_variables
2. Identifie le pire mois (flux_libre le plus bas) et le meilleur mois (flux_libre le plus haut, hors revenus_variables exceptionnels)
3. Calcule la moyenne du flux_libre sur tous les mois
4. Taux d'épargne = flux_libre_moyen / salaire_moyen × 100 (benchmark : <10% alerte, 10-20% correct, >20% sain)
5. DCA mensuel fixe = flux_libre_moyen × 0.75 (réserver 25% de marge comportementale)
6. DCA pire mois = max(flux_libre_pire_mois × 0.75, 0) — montant plancher sécurisé
7. DCA meilleur mois = flux_libre_meilleur_mois × 0.75 — montant en bonne passe
8. Investissement variable = moyenne(revenus_variables) × 0.80 (investir 80% dès réception)
9. Répartis le DCA mensuel fixe selon l'allocation cible (${allocationByHorizon.etf}/${allocationByHorizon.bonds}/${allocationByHorizon.satellite})
10. Si flux_libre_moyen <= 0 : identifier le poste variable qui dépasse le plus et chiffrer l'économie pour atteindre 150 euros/mois minimum
11. Formule un conseil court (1 phrase max) et un libellé de CTA actionnable (3-5 mots max)

CONTRAINTES :
- Ne jamais recommander 100% du flux libre
- Ne pas recalculer le matelas de sécurité
- L'épargne contractuelle dans les charges fixes est hors scope
- Tous les montants arrondis à l'entier le plus proche
- Le champ conseil_cta doit être un verbe d'action court (ex: "Ouvrir un PEA", "Configurer mon DCA", "Réduire les restaurants")
- Le champ alerte doit être null si aucune alerte, sinon une phrase courte
- Réponds UNIQUEMENT avec le JSON ci-dessous, sans texte autour, sans bloc markdown

{
  "flux_libre_moyen": 0,
  "flux_libre_pire_mois": 0,
  "flux_libre_meilleur_mois": 0,
  "taux_epargne_pct": 0,
  "dca_mensuel_fixe": 0,
  "dca_pire_mois": 0,
  "dca_meilleur_mois": 0,
  "investissement_variable_moyen": 0,
  "repartition": {
    "etf_world": 0,
    "fonds_euros": 0,
    "satellite": 0
  },
  "potentiel_annuel_plancher": 0,
  "potentiel_annuel_cible": 0,
  "alerte": null,
  "conseil": "phrase de conseil ici",
  "conseil_cta": "libellé CTA ici"
}

Remplace toutes les valeurs numériques et les chaînes par les vraies valeurs calculées.`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const horizon: number = typeof body.horizon === 'number' ? body.horizon : 10

    const releves = await prisma.releve.findMany({
      orderBy: { dateDebut: 'asc' },
      include: { transactions: true },
    })

    const monthlyData = releves.map(r => {
      const actives = r.transactions.filter(t => !t.exclure)
      const salaire = actives
        .filter(t => t.categorie === 'SALAIRE' && t.montant > 0)
        .reduce((s, t) => s + t.montant, 0)
      const revenus_variables = actives
        .filter(t => VARIABLE_INCOME_CATS.includes(t.categorie) && t.montant > 0)
        .reduce((s, t) => s + t.montant, 0)
      const charges_fixes = actives
        .filter(t => (CHARGES_FIXES as string[]).includes(t.categorie) && t.montant < 0)
        .reduce((s, t) => s + Math.abs(t.montant), 0)
      const depenses_variables = actives
        .filter(t => (BUDGET_CATEGORIES as string[]).includes(t.categorie) && t.montant < 0)
        .reduce((s, t) => s + Math.abs(t.montant), 0)
      return {
        periode: r.periode,
        salaire: Math.round(salaire),
        revenus_variables: Math.round(revenus_variables),
        charges_fixes: Math.round(charges_fixes),
        depenses_variables: Math.round(depenses_variables),
      }
    })

    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      messages: [{ role: 'user', content: buildPrompt(monthlyData, horizon) }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}'
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

    const analysis = JSON.parse(jsonrepair(jsonStr))
    return NextResponse.json(analysis)
  } catch (err) {
    console.error('[investment-analysis]', err)
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 },
    )
  }
}
