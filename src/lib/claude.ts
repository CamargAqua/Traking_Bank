import Anthropic from '@anthropic-ai/sdk'
import { jsonrepair } from 'jsonrepair'
import { CATEGORIES } from './categories'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface TransactionRaw {
  date: string
  libelle: string
  montant: number
  categorie: string
  confiance: 'haute' | 'moyenne' | 'basse'
  exclure: boolean
}

export interface ReleveInfo {
  numero: number
  dateDebut: string
  dateFin: string
  soldeDebut: number
  soldeFin: number
  transactions: TransactionRaw[]
}

const SYSTEM_PROMPT = `Tu analyses des relevés bancaires Crédit Agricole pour Victor Michel (Marseille).
Catégories : ${CATEGORIES.join(',')}

══ STRUCTURE DU RELEVÉ CA ══
Le relevé a DEUX sections séparées :
1. COMPTE COURANT — opérations avec colonne Débit | Crédit (virements, prélèvements, retraits DAB)
2. CARTE Gold Dd Premium n° 513108 — toutes des dépenses (montant négatif), listées par date d'achat

Règles de base :
- "Vir Inst de X" / "De X" / "Avoir X" / "Rem Chq" / "Virement [nom]" sans "vers" → CRÉDIT (positif)
- "Vir Inst vers X" / "Prlv X" / "Ret DAB" / "Cotis" / "Virement vers X" → DÉBIT (négatif)
- "Prlv Dépenses Carte X9768" → IGNORER complètement (prélèvement global carte, pas une transaction)
- "Annul. Vir" → IGNORER si suivi du même virement dans les 24h (correction bancaire)

PIÈGE MONTANTS CARTE — les libellés contiennent codes postaux et arrondissements :
"Bk Vieux Port 13 Marseille 1 29,35" → montant = -29.35 ("13" = dept, "1" = arrondissement, pas du prix)
"Nicolas 9610 13 Marseille 1 19,90" → montant = -19.90
Règle absolue : le DERNIER nombre avant "¨" est toujours le montant réel.

DATES CARTE — la section carte n'affiche que jour.mois sans année.
Déduis l'année depuis le contexte du relevé. La carte couvre du 21 du mois précédent au 21 du mois courant.

══ REVENUS SERES TECHNOLOGIES ══
Tout virement de "Seres" ou "Seres Technologies" est un revenu (exclure:false).
- Virement >1 500€ (ref SERESTECH-...) → SALAIRE, confiance:haute (salaire net ~3 150–3 800€/mois)
- Virement <600€ (ref NSRS...) → NOTE_FRAIS, confiance:haute (notes de frais, délai habituel)
- Virement 600–1 500€ → PRIME, confiance:moyenne
Deux virements NSRS le même mois avec références différentes = normal (mois décalés).

══ À EXCLURE TOTALEMENT (exclure:true) ══
- "Domaine Camargaqua" / "Cca Domaine" / "Retour Cca Domaine" → VIREMENT_INTERNE (compte pro)
- "Web M. Michel Victor" → VIREMENT_INTERNE (virement vers autre compte perso)
- "De M. Michel Philippe" → VIREMENT_INTERNE (père)
- "Luana Di Carlo" / "Luana D" (dans les deux sens, virement ou Wero) → REMBOURSEMENT_COLOC
  (fiancée/colocataire : elle rembourse ~650€/mois = moitié loyer Oiko + charges partagées)

══ LOGEMENT ══
- "Oiko Gestion" / "SAS Oiko Gestion" → LOGEMENT, confiance:haute (loyer 1 085€/mois, payé le 1–3 du mois)
- "Electricité De France" / "EDF" → LOGEMENT, confiance:haute
- "Q-park" → LOGEMENT, confiance:haute (parking mensuel ~58,34€)

══ ASSURANCE ══
- "Filhet-allard" DÉBIT (montant négatif) → ASSURANCE, confiance:haute (mutuelle santé)
- "Filhet-allard" CRÉDIT (montant positif) → REMBOURSEMENT_DIVERS, confiance:haute (remboursement frais médicaux)
- "Gp - Assurance Fnac Multimedia" → ASSURANCE, confiance:haute

══ ABONNEMENTS ══
- SFR (2 prélèvements/mois : ~48€ + ~30€) → ABONNEMENT
- "Lc Aqua" / "Vibes Fitness" → ABONNEMENT (salle de sport ~29,90€/mois)
- "Fnac Darty Services" → ABONNEMENT
- Netflix / "Netflix.com" → ABONNEMENT
- "Apple.com/bill" / "Apple Cork" → ABONNEMENT
- "Ionos" → ABONNEMENT
- "Uber One" / "Uber *one" → ABONNEMENT
- "Cotis Offre Premium" / "Offre Premium CA" → ABONNEMENT (frais compte CA)
- "Claude.ai" → ABONNEMENT

══ ÉPARGNE ══
- "Mens.pel" / "Virement Mens.pel" → EPARGNE (PEL ~45€/mois)

══ REMBOURSEMENT DETTE ══
- "CRCAM" prêt → REMBOURSEMENT_DETTE (prêt personnel ~263,88€/mois, début fév 2026)
- "Intérets débiteurs" → REMBOURSEMENT_DETTE (agios découvert)

══ REMBOURSEMENTS DIVERS (exclure:false) ══
- Virements Wero ou vir inst REÇUS d'amis/tiers → REMBOURSEMENT_DIVERS
- "France Travail" → REMBOURSEMENT_DIVERS
- "Avoir Carte X9768" → REMBOURSEMENT_DIVERS (remboursement sur achat carte)
- "Rem Chq" montant <500€ → REMBOURSEMENT_DIVERS (cadeaux, petits remboursements)
- "Rem Chq" montant ≥500€ → REMBOURSEMENT_DIVERS, confiance:basse (grosse rentrée à vérifier)

══ VIREMENTS WERO SORTANTS (vers amis, hors Luana) ══
Remboursements envoyés à des tiers → REMBOURSEMENT_DIVERS, exclure:false, confiance:basse

══ TRANSPORT ══
- "Lime*trajet" / "Lime*pass" → TRANSPORT
- "Uber *trip" → TRANSPORT
- "ASF" / "Autoroutes Du Sud" → TRANSPORT (péage)
- "RTM" → TRANSPORT
- "Service Navigo" → TRANSPORT (pass Paris)
- "Tfl Travel" → TRANSPORT (métro Londres)
- "Voi Fr" → TRANSPORT (trottinettes)
- Station essence → TRANSPORT
- "Areas Parislyon" → TRANSPORT
- "Tsgn Sn Gat Airport" → TRANSPORT (parking Gatwick)

══ RESTOS / BARS ══
- Restaurants, bars, cafés, fast food (Mc Donald's, BK, Shake Shack, etc.)
- "Le Cool", "Le Pointu", "Bar Du Bochor", "L Ours", "Le Meteor", "Le Baby", etc.
- Établissements à Londres (Dines*, Three Greyhounds, etc.)
- "Picnic" → RESTOS (livraison repas)

══ ALIMENTATION ══
- Supermarchés : Carrefour, Monoprix, Casino, "Mp*carrefour", Picard, Monop'
- Boulangeries, boucheries, primeurs
- "Cavavin", "Nicolas" → ALIMENTATION (caves à vins)
- "Prim'logistique" → ALIMENTATION
- "Uep*u Express" → ALIMENTATION (épicerie)

══ SANTÉ ══
- "Doctolib" → SANTE
- "Chirurgiens Den" / dentiste → SANTE
- "Phie" / pharmacie → SANTE

══ SHOPPING ══
- Amazon, Decathlon, Norauto, "Sc Maisons", Mango, Uniqlo, Gifi
- "Leboncoin" → SHOPPING
- Magasins vêtements, décoration, sport
- "Favre Sports" → SHOPPING (sport/ski)

══ IMPÔTS ══
- "Direction Générale Des Finances" / "DGFiP" → IMPOTS

══ CASH DAB ══
- "Ret DAB" → CASH_DAB

══ NON_CATEGORISE ══
- "Little Store" → NON_CATEGORISE
- "Mmct" → NON_CATEGORISE
- "Payplug.com" → NON_CATEGORISE
- "Pvp Et Associes" → NON_CATEGORISE
- "tokoya" → NON_CATEGORISE
- Tout virement sortant vers inconnu >200€ → NON_CATEGORISE, confiance:basse
- Tout inconnu → NON_CATEGORISE, confiance:basse

══ FORMAT DE SORTIE ══
IMPORTANT : compact, pas d'espaces superflus, libellés ≤40 chars.
Retourne UNIQUEMENT du JSON valide :
{"numero":1,"dateDebut":"2025-12-04","dateFin":"2026-01-02","soldeDebut":309.52,"soldeFin":1714.87,"transactions":[{"date":"YYYY-MM-DD","libelle":"Libellé court","montant":-123.45,"categorie":"CATEGORIE","confiance":"haute","exclure":false}]}`

function repairJson(raw: string): string {
  const match = raw.match(/\{[\s\S]*/)
  if (!match) throw new Error('Pas de JSON dans la réponse Claude')
  let s = match[0].replace(/,\s*([}\]])/g, '$1')
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

export async function parseReleveWithClaude(pdfText: string): Promise<ReleveInfo> {
  const truncated = pdfText.slice(0, 25000)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    messages: [{
      role: 'user',
      content: `Relevé bancaire Crédit Agricole de Victor Michel. Extrais toutes les transactions en JSON.\n\n${truncated}`,
    }],
    system: SYSTEM_PROMPT,
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Réponse Claude inattendue')

  let raw = content.text.trim()
  console.log('[claude] stop_reason:', message.stop_reason, '| transactions ~', raw.split('"date"').length - 1)

  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

  try { return JSON.parse(raw) as ReleveInfo } catch { /* fallthrough */ }

  try {
    return JSON.parse(jsonrepair(raw)) as ReleveInfo
  } catch (e) {
    console.error('[claude] jsonrepair failed, raw snippet:', raw.slice(0, 400))
    throw new Error('Impossible de parser la réponse Claude. Réessayez.')
  }
}
