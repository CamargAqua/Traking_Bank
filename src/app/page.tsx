import { prisma } from '@/lib/db'
import { Sidebar } from '@/components/Sidebar'
import { KPICard } from '@/components/KPICard'
import { CategoryChart } from '@/components/CategoryChart'
import { TransactionList } from '@/components/TransactionList'
import { HistoryChart } from '@/components/HistoryChart'
import { REVENUS, CHARGES_FIXES, EXCLUS, CATEGORIE_LABELS, CATEGORIE_COLORS, type Categorie } from '@/lib/categories'
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
  const notesFrais = actives.filter(t => t.categorie === 'NOTE_FRAIS' && t.montant > 0).reduce((s, t) => s + t.montant, 0)
  const prime = actives.filter(t => t.categorie === 'PRIME' && t.montant > 0).reduce((s, t) => s + t.montant, 0)
  const remboursements = actives.filter(t => t.categorie === 'REMBOURSEMENT_DIVERS' && t.montant > 0).reduce((s, t) => s + t.montant, 0)
  const revenuExceptionnel = actives.filter(t => t.categorie === 'REVENU_EXCEPTIONNEL' && t.montant > 0).reduce((s, t) => s + t.montant, 0)
  const revenus = salaire + notesFrais + prime + remboursements + revenuExceptionnel

  const chargesFixes = actives
    .filter(t => CHARGES_FIXES.includes(t.categorie as Categorie) && t.montant < 0)
    .reduce((s, t) => s + Math.abs(t.montant), 0)

  const depensesVariables = actives
    .filter(t => !REVENUS.includes(t.categorie as Categorie) && !CHARGES_FIXES.includes(t.categorie as Categorie) && !EXCLUS.includes(t.categorie as Categorie) && t.montant < 0)
    .reduce((s, t) => s + Math.abs(t.montant), 0)

  const epargne = actives.filter(t => t.categorie === 'EPARGNE' && t.montant < 0).reduce((s, t) => s + Math.abs(t.montant), 0)
  const soldeNet = revenus - chargesFixes - depensesVariables
  const resteAVivre = revenus - chargesFixes
  const tauxCharges = revenus > 0 ? Math.round((chargesFixes / revenus) * 100) : 0
  const tauxEpargne = revenus > 0 ? Math.round((epargne / revenus) * 100) : 0
  const uncategorizedCount = actives.filter(t => t.categorie === 'NON_CATEGORISE').length

  // ── Charges fixes breakdown ───────────────────────────────────────────────
  const chargesDetail = CHARGES_FIXES.map(cat => ({
    cat,
    total: actives.filter(t => t.categorie === cat && t.montant < 0).reduce((s, t) => s + Math.abs(t.montant), 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)
  const chargesMax = chargesDetail[0]?.total ?? 1

  // ── Catégories chart ──────────────────────────────────────────────────────
  const catMap = new Map<string, number>()
  actives
    .filter(t => t.montant < 0 && !EXCLUS.includes(t.categorie as Categorie) && t.categorie !== 'NON_CATEGORISE')
    .forEach(t => catMap.set(t.categorie, (catMap.get(t.categorie) ?? 0) + Math.abs(t.montant)))
  const catData = [...catMap.entries()]
    .map(([categorie, total]) => ({ categorie, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  // ── Top marchands ─────────────────────────────────────────────────────────
  const merchantMap = new Map<string, number>()
  actives
    .filter(t => t.montant < 0 && !EXCLUS.includes(t.categorie as Categorie))
    .forEach(t => {
      const key = t.libelle
      merchantMap.set(key, (merchantMap.get(key) ?? 0) + Math.abs(t.montant))
    })
  const topMerchants = [...merchantMap.entries()]
    .map(([libelle, total]) => ({ libelle, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
  const topMax = topMerchants[0]?.total ?? 1

  return (
    <div className="flex min-h-screen">
      <Sidebar releves={releves} selectedId={activeId} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="bg-white border-b border-[#ebebeb] px-7 py-3.5 flex items-center justify-between sticky top-0 z-10">
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
          {releves.length > 0 && activeId && (
            <PeriodSelector releves={releves} activeId={activeId} />
          )}
        </div>

        <div className="p-7 flex flex-col gap-5 overflow-y-auto">

          {/* KPIs row 1 */}
          <div className="grid grid-cols-4 gap-3.5">
            <KPICard label="Revenus encaissés" value={fmtAmount(revenus)} color="green" sub="salaire + frais + remboursements" />
            <KPICard label="Charges fixes" value={fmtAmount(chargesFixes)} sub={`${tauxCharges}% des revenus`} />
            <KPICard label="Dépenses variables" value={fmtAmount(depensesVariables)} color={depensesVariables > revenus * 0.4 ? 'red' : 'default'} sub="restos, courses, transport…" />
            <KPICard label="Solde net du mois" value={fmtAmount(soldeNet)} color={soldeNet >= 0 ? 'default' : 'red'} sub={`Fin de mois : ${fmtAmount(releve?.soldeFin ?? 0)}`} />
          </div>

          {/* Row 2: Revenus detail + Charges breakdown + Épargne/Reste à vivre */}
          <div className="grid grid-cols-3 gap-3.5">

            {/* Revenus détail */}
            <div className="bg-white border border-[#ebebeb] rounded-xl p-5">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#bbb] mb-3">Détail revenus</div>
              <div className="flex flex-col gap-2">
                {salaire > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] text-[#555]">Salaire</span>
                    <span className="text-[13px] font-semibold text-[#00b37e]">+{fmtAmount(salaire)}</span>
                  </div>
                )}
                {prime > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] text-[#555]">Prime / variable</span>
                    <span className="text-[13px] font-semibold text-[#059669]">+{fmtAmount(prime)}</span>
                  </div>
                )}
                {notesFrais > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] text-[#555]">Notes de frais</span>
                    <span className="text-[13px] font-semibold text-[#10b981]">+{fmtAmount(notesFrais)}</span>
                  </div>
                )}
                {remboursements > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] text-[#555]">Remboursements</span>
                    <span className="text-[13px] font-semibold text-[#64748b]">+{fmtAmount(remboursements)}</span>
                  </div>
                )}
                {revenuExceptionnel > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] text-[#555]">Exceptionnel</span>
                    <span className="text-[13px] font-semibold text-[#0ea5e9]">+{fmtAmount(revenuExceptionnel)}</span>
                  </div>
                )}
                <div className="border-t border-[#f2f2f2] mt-1 pt-2 flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#111]">Total</span>
                  <span className="text-[14px] font-bold text-[#00b37e]">+{fmtAmount(revenus)}</span>
                </div>
              </div>
            </div>

            {/* Charges fixes breakdown */}
            <div className="bg-white border border-[#ebebeb] rounded-xl p-5">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#bbb] mb-3">Charges fixes</div>
              <div className="flex flex-col gap-2.5">
                {chargesDetail.map(({ cat, total }) => (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11.5px] text-[#555]">{CATEGORIE_LABELS[cat as Categorie]}</span>
                      <span className="text-[11.5px] font-semibold text-[#111]">{fmtAmountShort(total)}</span>
                    </div>
                    <div className="h-1.5 bg-[#f2f2f2] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round((total / chargesMax) * 100)}%`,
                          background: CATEGORIE_COLORS[cat as Categorie] ?? '#ccc',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Épargne + Reste à vivre */}
            <div className="bg-white border border-[#ebebeb] rounded-xl p-5 flex flex-col gap-4">
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#bbb] mb-2">Taux d&apos;épargne</div>
                <div className="text-[28px] font-bold tracking-[-1px] text-[#06b6d4]">{tauxEpargne}%</div>
                <div className="text-[11.5px] text-[#999] mt-0.5">{fmtAmount(epargne)} mis de côté</div>
                <div className="h-2 bg-[#f2f2f2] rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-[#06b6d4] rounded-full transition-all" style={{ width: `${Math.min(tauxEpargne, 100)}%` }} />
                </div>
              </div>
              <div className="border-t border-[#f2f2f2] pt-4">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#bbb] mb-2">Reste à vivre</div>
                <div className={`text-[24px] font-bold tracking-[-0.8px] ${resteAVivre >= 0 ? 'text-[#111]' : 'text-[#e53e3e]'}`}>
                  {fmtAmount(resteAVivre)}
                </div>
                <div className="text-[11.5px] text-[#999] mt-0.5">après charges fixes</div>
                <div className="h-2 bg-[#f2f2f2] rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${revenus > 0 ? Math.min(Math.round((resteAVivre / revenus) * 100), 100) : 0}%`,
                      background: resteAVivre >= revenus * 0.5 ? '#00b37e' : resteAVivre >= revenus * 0.3 ? '#f59e0b' : '#e53e3e',
                    }}
                  />
                </div>
              </div>
            </div>
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

          {/* Top marchands */}
          {topMerchants.length > 0 && (
            <div className="bg-white border border-[#ebebeb] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#f2f2f2] flex items-center justify-between">
                <span className="text-[13.5px] font-bold tracking-[-0.2px]">Top dépenses</span>
                <span className="text-[11.5px] text-[#999]">par marchand</span>
              </div>
              <div className="p-5 grid grid-cols-2 gap-x-8 gap-y-2.5">
                {topMerchants.map(({ libelle, total }, i) => (
                  <div key={libelle}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10.5px] text-[#bbb] w-4 shrink-0">#{i + 1}</span>
                        <span className="text-[12.5px] text-[#333] truncate">{libelle}</span>
                      </div>
                      <span className="text-[12px] font-semibold text-[#555] shrink-0 ml-2">{fmtAmountShort(total)}</span>
                    </div>
                    <div className="h-1.5 bg-[#f2f2f2] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#f97316] rounded-full"
                        style={{ width: `${Math.round((total / topMax) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
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
