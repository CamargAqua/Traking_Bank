import { prisma } from '@/lib/db'
import { Sidebar } from '@/components/Sidebar'
import { KPICard } from '@/components/KPICard'
import { CategoryChart } from '@/components/CategoryChart'
import { TransactionList } from '@/components/TransactionList'
import { HistoryChart } from '@/components/HistoryChart'
import { REVENUS, CHARGES_FIXES, EXCLUS, CATEGORIE_LABELS, CATEGORIE_COLORS, type Categorie } from '@/lib/categories'
import { ChargesAccordion } from '@/components/ChargesAccordion'
import { RevenusCard } from '@/components/RevenusCard'
import { SoldeKPIs } from '@/components/SoldeKPIs'
import { ResteAVivreCard } from '@/components/ResteAVivreCard'
import Link from 'next/link'
import { PeriodSelector } from '@/components/PeriodSelector'

interface PageProps {
  searchParams: Promise<{ releve?: string }>
}

async function getReleves() {
  return prisma.releve.findMany({ orderBy: { dateDebut: 'desc' } })
}

async function getReleveData(id: string) {
  return prisma.releve.findUnique({
    where: { id },
    include: { transactions: { orderBy: { date: 'desc' } } },
  })
}

async function getBulletins() {
  return prisma.bulletinSalaire.findMany({ orderBy: { periode: 'desc' } })
}

const MONTH_FR = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc']
function fmtPeriode(p: string) {
  const [y, m] = p.split('-')
  return `${MONTH_FR[parseInt(m) - 1]} ${y}`
}
function fmtDate(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtAmount(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}
function fmtAmountShort(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €'
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { releve: releveId } = await searchParams
  const releves = await getReleves()

  const activeId = releveId ?? releves[0]?.id
  const releve = activeId ? await getReleveData(activeId) : null
  const history = releves.map(r => ({ periode: r.periode, soldeFin: r.soldeFin }))

  const bulletins = await getBulletins()

  // Bulletin for current period
  const bulletinActuel = releve ? bulletins.find(b => b.periode === releve.periode) : null

  if (releves.length === 0) {
    return (
      <div className="flex min-h-screen">
        <Sidebar releves={[]} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">📂</div>
            <h2 className="text-[18px] font-bold mb-2">Aucun relevé importé</h2>
            <p className="text-[13px] text-[#999] mb-6">Commencez par importer votre premier relevé bancaire PDF.</p>
            <Link href="/import" className="bg-[#00b37e] text-white px-5 py-2.5 rounded-lg text-[13px] font-semibold hover:opacity-90 transition-opacity inline-block">
              Importer un relevé →
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const transactions = releve?.transactions ?? []
  const actives = transactions.filter(t => !t.exclure)

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const salaire = actives.filter(t => t.categorie === 'SALAIRE' && t.montant > 0).reduce((s, t) => s + t.montant, 0)
  const revenus = salaire

  // Estimation fixe/variable depuis bulletin (proportion brute appliquée au net réel)
  const brutTotal = bulletinActuel ? bulletinActuel.salaireBrutFixe + bulletinActuel.salaireBrutVar : 0
  const netFixeEst = bulletinActuel && brutTotal > 0 ? salaire * (bulletinActuel.salaireBrutFixe / brutTotal) : salaire
  const netVarEst  = bulletinActuel && brutTotal > 0 ? salaire * (bulletinActuel.salaireBrutVar  / brutTotal) : 0



  const chargesFixesBrutes = actives
    .filter(t => CHARGES_FIXES.includes(t.categorie as Categorie) && t.montant < 0)
    .reduce((s, t) => s + Math.abs(t.montant), 0)

  const participationColoc = actives
    .filter(t => t.categorie === 'REMBOURSEMENT_COLOC' && t.montant > 0)
    .reduce((s, t) => s + t.montant, 0)

  const chargesFixes = chargesFixesBrutes - participationColoc

  const depensesVariablesBrutes = actives
    .filter(t => !REVENUS.includes(t.categorie as Categorie) && !CHARGES_FIXES.includes(t.categorie as Categorie) && !EXCLUS.includes(t.categorie as Categorie) && t.montant < 0)
    .reduce((s, t) => s + Math.abs(t.montant), 0)

  // Remboursements reçus de tiers (Wero, virements perso) → déduire des dépenses
  const remboursementsReçus = actives
    .filter(t => t.categorie === 'REMBOURSEMENT_DIVERS' && t.montant > 0)
    .reduce((s, t) => s + t.montant, 0)

  const depensesVariables = depensesVariablesBrutes - remboursementsReçus

  const epargne = actives.filter(t => t.categorie === 'EPARGNE' && t.montant < 0).reduce((s, t) => s + Math.abs(t.montant), 0)
  const soldeNet = revenus - chargesFixes - depensesVariables
  const resteAVivre = revenus - chargesFixes
  const tauxCharges = revenus > 0 ? Math.round((chargesFixes / revenus) * 100) : 0
  const tauxEpargne = revenus > 0 ? Math.round((epargne / revenus) * 100) : 0
  const uncategorizedCount = actives.filter(t => t.categorie === 'NON_CATEGORISE').length

  // ── Charges fixes breakdown ───────────────────────────────────────────────
  const chargesDetail = CHARGES_FIXES.map(cat => {
    const txs = actives.filter(t => t.categorie === cat && t.montant < 0)
    return {
      cat,
      total: txs.reduce((s, t) => s + Math.abs(t.montant), 0),
      txs: txs.map(t => ({ libelle: t.libelle, montant: t.montant })),
    }
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  if (participationColoc > 0) {
    const colocTxs = actives.filter(t => t.categorie === 'REMBOURSEMENT_COLOC' && t.montant > 0)
    chargesDetail.push({
      cat: 'REMBOURSEMENT_COLOC',
      total: -participationColoc,
      txs: colocTxs.map(t => ({ libelle: t.libelle, montant: t.montant })),
    })
  }

  // ── Catégories chart — toutes les dépenses (charges fixes + variables) ────
  const catMap = new Map<string, number>()
  actives
    .filter(t =>
      t.montant < 0 &&
      !EXCLUS.includes(t.categorie as Categorie) &&
      !REVENUS.includes(t.categorie as Categorie) &&
      t.categorie !== 'NON_CATEGORISE'
    )
    .forEach(t => catMap.set(t.categorie, (catMap.get(t.categorie) ?? 0) + Math.abs(t.montant)))
  const catData = [...catMap.entries()]
    .map(([categorie, total]) => ({ categorie, total }))
    .sort((a, b) => b.total - a.total)

  // Ajouter les remboursements reçus comme déduction (montant négatif = barre verte)
  if (remboursementsReçus > 0) {
    catData.push({ categorie: 'REMBOURSEMENT_DIVERS', total: -remboursementsReçus })
  }


  return (
    <div className="flex min-h-screen">
      <Sidebar releves={releves} selectedId={activeId} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="bg-white border-b border-[#ebebeb] px-7 py-3.5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-2.5">
              <span className="text-[16px] font-bold tracking-[-0.3px]">
                {releve ? fmtPeriode(releve.periode) : 'Dashboard'}
              </span>
              {releve && (
                <span className="text-[12px] text-[#999]">
                  {fmtDate(releve.dateDebut)} → {fmtDate(releve.dateFin)}
                </span>
              )}
            </div>
            {releve && (() => {
              const cardStart = new Date(releve.dateDebut)
              cardStart.setMonth(cardStart.getMonth() - 1)
              cardStart.setDate(20)
              const cardEnd = new Date(releve.dateDebut)
              cardEnd.setDate(19)
              return (
                <span className="text-[11px] text-[#bbb] bg-[#f7f7f5] border border-[#ebebeb] rounded-full px-2.5 py-0.5">
                  carte {fmtDate(cardStart)} → {fmtDate(cardEnd)}
                </span>
              )
            })()}
          </div>
          {releves.length > 0 && activeId && (
            <PeriodSelector releves={releves} activeId={activeId} />
          )}
        </div>

        <div className="p-7 flex flex-col gap-5 overflow-y-auto">

          {/* KPIs row 1 */}
          <div className="grid grid-cols-4 gap-3.5">
            <KPICard label="Revenus encaissés" value={fmtAmount(revenus)} color="green" sub={bulletinActuel && netVarEst > 0 ? `fixe ~${fmtAmountShort(netFixeEst)} · var ~${fmtAmountShort(netVarEst)}` : 'virement Seres'} />
            <KPICard label="Charges fixes" value={fmtAmount(chargesFixes)} sub={`${tauxCharges}% des revenus`} />
            <KPICard label="Dépenses variables" value={fmtAmount(depensesVariables)} color={depensesVariables > revenus * 0.4 ? 'red' : 'default'} sub="restos, courses, transport…" />
            <SoldeKPIs
              soldeNetBase={soldeNet}
              soldeFin={releve?.soldeFin ?? 0}
              periode={releve?.periode ?? ''}
            />
          </div>

          {/* Row 2: Revenus detail + Charges breakdown + Épargne/Reste à vivre */}
          <div className="grid grid-cols-3 gap-3.5">

            {/* Revenus détail */}
            <RevenusCard
              revenus={revenus}
              netFixeEst={netFixeEst}
              netVarEst={netVarEst}
              hasBulletin={!!(bulletinActuel && brutTotal > 0)}
              periode={releve?.periode ?? ''}
            />

            {/* Charges fixes — accordion cliquable */}
            <div className="bg-white border border-[#ebebeb] rounded-xl p-5">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#bbb] mb-3">
                Charges fixes · {fmtAmountShort(chargesFixes)}
              </div>
              <ChargesAccordion items={chargesDetail} />
            </div>

            {/* Reste à vivre */}
            <ResteAVivreCard
              resteAVivreBase={resteAVivre}
              revenus={revenus}
              tauxCharges={tauxCharges}
              epargne={epargne}
              periode={releve?.periode ?? ''}
            />
          </div>

          {/* Banner non catégorisées */}
          {uncategorizedCount > 0 && (
            <div className="bg-[#fffbeb] border border-[#fde68a] rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-[#fef3c7] border border-[#fde68a] rounded-lg flex items-center justify-center text-base shrink-0">⚠</div>
              <div>
                <p className="text-[13px] font-semibold text-[#92400e]">{uncategorizedCount} transaction{uncategorizedCount > 1 ? 's' : ''} à taguer</p>
                <p className="text-[12px] text-[#b45309]">Non incluses dans les totaux — cliquez sur une ligne pour la catégoriser.</p>
              </div>
            </div>
          )}

          {/* Charts row */}
          <div className="grid gap-3.5" style={{ gridTemplateColumns: '1fr 1.4fr' }}>
            <div className="bg-white border border-[#ebebeb] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#f2f2f2] flex items-center justify-between">
                <span className="text-[13.5px] font-bold tracking-[-0.2px]">Dépenses par catégorie</span>
                <span className="text-[11.5px] text-[#999]">{releve ? fmtPeriode(releve.periode) : ''}</span>
              </div>
              <div className="p-5">
                {catData.length > 0 ? <CategoryChart data={catData} /> : (
                  <p className="text-[13px] text-[#bbb] text-center py-4">Aucune dépense</p>
                )}
              </div>
            </div>

            <div className="bg-white border border-[#ebebeb] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#f2f2f2] flex items-center justify-between">
                <span className="text-[13.5px] font-bold tracking-[-0.2px]">Évolution du solde net</span>
                <span className="text-[11.5px] text-[#999]">{releves.length} relevé{releves.length > 1 ? 's' : ''}</span>
              </div>
              <div className="p-5 h-56">
                <HistoryChart data={history} />
              </div>
            </div>
          </div>

          {/* Bulletin de salaire (si importé pour ce mois) */}
          {bulletinActuel && (
            <div className="bg-white border border-[#ebebeb] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#f2f2f2] flex items-center justify-between">
                <span className="text-[13.5px] font-bold tracking-[-0.2px]">Bulletin de salaire</span>
                <span className="text-[11.5px] text-[#999]">{bulletinActuel.periode}</span>
              </div>
              <div className="p-5 grid grid-cols-4 gap-5">
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#bbb] mb-1.5">Brut fixe</div>
                  <div className="text-[18px] font-bold tracking-[-0.5px]">{fmtAmount(bulletinActuel.salaireBrutFixe)}</div>
                </div>
                {bulletinActuel.salaireBrutVar > 0 && (
                  <div>
                    <div className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#bbb] mb-1.5">Variable</div>
                    <div className="text-[18px] font-bold tracking-[-0.5px] text-[#059669]">+{fmtAmount(bulletinActuel.salaireBrutVar)}</div>
                  </div>
                )}
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#bbb] mb-1.5">Cotisations</div>
                  <div className="text-[18px] font-bold tracking-[-0.5px] text-[#e53e3e]">−{fmtAmount(bulletinActuel.cotisations)}</div>
                </div>
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#bbb] mb-1.5">Net payé</div>


                  <div className="text-[18px] font-bold tracking-[-0.5px] text-[#00b37e]">{fmtAmount(bulletinActuel.netVerse)}</div>

                  {salaire > 0 && (
                    <div className={`text-[11px] mt-0.5 ${Math.abs(salaire - bulletinActuel.netVerse) < 50 ? 'text-[#00b37e]' : 'text-[#d97706]'}`}>
                      Reçu: {fmtAmount(salaire)} {Math.abs(salaire - bulletinActuel.netVerse) < 50 ? '✓' : `(écart ${fmtAmountShort(Math.abs(salaire - bulletinActuel.netVerse))})`}

                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Transactions */}
          <div className="bg-white border border-[#ebebeb] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#f2f2f2] flex items-center justify-between">
              <span className="text-[13.5px] font-bold tracking-[-0.2px]">Transactions</span>
              <span className="text-[11.5px] text-[#999]">{actives.length} opérations</span>
            </div>
            <TransactionList transactions={transactions} />
          </div>

        </div>
      </main>
    </div>
  )
}
