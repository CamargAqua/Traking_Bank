import { prisma } from '@/lib/db'
import { Sidebar } from '@/components/Sidebar'
import { KPICard } from '@/components/KPICard'
import { CategoryChart } from '@/components/CategoryChart'
import { TransactionList } from '@/components/TransactionList'
import { HistoryChart } from '@/components/HistoryChart'
import { REVENUS, CHARGES_FIXES, EXCLUS, type Categorie } from '@/lib/categories'
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

export default async function DashboardPage({ searchParams }: PageProps) {
  const { releve: releveId } = await searchParams
  const releves = await getReleves()

  // Sélectionner le relevé : param URL ou le plus récent
  const activeId = releveId ?? releves[0]?.id
  const releve = activeId ? await getReleveData(activeId) : null

  // Historique soldes pour le graphique
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
            <Link
              href="/import"
              className="bg-[#00b37e] text-white px-5 py-2.5 rounded-lg text-[13px] font-semibold hover:opacity-90 transition-opacity inline-block"
            >
              Importer un relevé →
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const transactions = releve?.transactions ?? []

  // Toutes les transactions du relevé = le mois (carte 21→20 + charges + salaire)
  const actives = transactions.filter(t => !t.exclure)

  // KPIs
  const revenus = actives
    .filter(t => REVENUS.includes(t.categorie as Categorie) && t.montant > 0)
    .reduce((s, t) => s + t.montant, 0)

  const chargesFixes = actives
    .filter(t => CHARGES_FIXES.includes(t.categorie as Categorie) && t.montant < 0)
    .reduce((s, t) => s + Math.abs(t.montant), 0)

  const depensesVariables = actives
    .filter(t => !REVENUS.includes(t.categorie as Categorie) && !CHARGES_FIXES.includes(t.categorie as Categorie) && !EXCLUS.includes(t.categorie as Categorie) && t.montant < 0)
    .reduce((s, t) => s + Math.abs(t.montant), 0)

  const soldeNet = revenus - chargesFixes - depensesVariables
  const uncategorizedCount = actives.filter(t => t.categorie === 'NON_CATEGORISE').length

  // Catégories (dépenses seulement, triées)
  const catMap = new Map<string, number>()
  actives
    .filter(t => t.montant < 0 && !EXCLUS.includes(t.categorie as Categorie) && t.categorie !== 'NON_CATEGORISE')
    .forEach(t => catMap.set(t.categorie, (catMap.get(t.categorie) ?? 0) + Math.abs(t.montant)))

  const catData = [...catMap.entries()]
    .map(([categorie, total]) => ({ categorie, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

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

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-3.5">
            <KPICard
              label="Revenus nets"
              value={fmtAmount(revenus)}
              color="green"
              sub="encaissés ce mois"
            />
            <KPICard
              label="Charges fixes"
              value={fmtAmount(chargesFixes)}
              sub="Loyer · SFR · PEL · Prêt"
            />
            <KPICard
              label="Dépenses variables"
              value={fmtAmount(depensesVariables)}
              color={depensesVariables > revenus * 0.4 ? 'red' : 'default'}
              sub="restaurants, courses, etc."
            />
            <KPICard
              label="Solde net du mois"
              value={fmtAmount(soldeNet)}
              color={soldeNet >= 0 ? 'default' : 'red'}
              sub={`Fin de mois : ${fmtAmount(releve?.soldeFin ?? 0)}`}
            />
          </div>

          {/* Banner non catégorisées */}
          {uncategorizedCount > 0 && (
            <div className="bg-[#fffbeb] border border-[#fde68a] rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#fef3c7] border border-[#fde68a] rounded-lg flex items-center justify-center text-base shrink-0">
                  ⚠
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#92400e]">{uncategorizedCount} transaction{uncategorizedCount > 1 ? 's' : ''} non catégorisée{uncategorizedCount > 1 ? 's' : ''}</p>
                  <p className="text-[12px] text-[#b45309]">Non incluses dans les totaux — cliquez sur une ligne pour la taguer.</p>
                </div>
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid gap-3.5" style={{ gridTemplateColumns: '1fr 1.4fr' }}>
            {/* Catégories */}
            <div className="bg-white border border-[#ebebeb] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#f2f2f2] flex items-center justify-between">
                <span className="text-[13.5px] font-bold tracking-[-0.2px]">Dépenses par catégorie</span>
                <span className="text-[11.5px] text-[#999]">{releve ? fmtPeriode(releve.periode) : ''}</span>
              </div>
              <div className="p-5">
                {catData.length > 0 ? (
                  <CategoryChart data={catData} />
                ) : (
                  <p className="text-[13px] text-[#bbb] text-center py-4">Aucune dépense</p>
                )}
              </div>
            </div>

            {/* Historique */}
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

          {/* Transactions */}
          <div className="bg-white border border-[#ebebeb] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#f2f2f2] flex items-center justify-between">
              <span className="text-[13.5px] font-bold tracking-[-0.2px]">Transactions</span>
              <span className="text-[11.5px] text-[#999]">{transactions.length} opérations</span>
            </div>
            <TransactionList transactions={transactions} />
          </div>

        </div>
      </main>
    </div>
  )
}
