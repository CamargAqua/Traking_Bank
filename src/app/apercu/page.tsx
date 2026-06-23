import { prisma } from '@/lib/db'
import { Sidebar } from '@/components/Sidebar'
import { VariableEvolutionChart, type EvolutionMonth, type EvolutionCat } from '@/components/VariableEvolutionChart'
import { BudgetTable, type BudgetRow } from '@/components/BudgetTable'
import { InvestmentCapacity } from '@/components/InvestmentCapacity'
import {
  BUDGET_CATEGORIES, DEFAULT_BUDGETS, CATEGORIE_LABELS, CATEGORIE_COLORS, type Categorie,
} from '@/lib/categories'

const MONTH_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
function moisCourt(periode: string) {
  const [, m] = periode.split('-')
  return MONTH_FR[parseInt(m) - 1] ?? periode
}
function fmtAmount(n: number) {
  return Math.round(n).toLocaleString('fr-FR') + ' €'
}

async function getReleves() {
  return prisma.releve.findMany({ orderBy: { dateDebut: 'asc' } })
}

async function getData() {
  const releves = await prisma.releve.findMany({
    orderBy: { dateDebut: 'asc' },
    include: { transactions: true },
  })
  const budgets = await prisma.budgetCategorie.findMany()
  return { releves, budgets }
}

export default async function ApercuPage() {
  const relevesNav = await getReleves()
  const { releves, budgets } = await getData()

  const budgetMap = new Map(budgets.map(b => [b.categorie, b.montantCible]))
  const cible = (cat: string) => budgetMap.get(cat) ?? DEFAULT_BUDGETS[cat] ?? 0

  // Dépenses variables par mois et par poste
  const months: EvolutionMonth[] = releves.map(r => {
    const actives = r.transactions.filter(t => !t.exclure)
    const values: Record<string, number> = {}
    for (const cat of BUDGET_CATEGORIES) {
      values[cat] = actives
        .filter(t => t.categorie === cat && t.montant < 0)
        .reduce((s, t) => s + Math.abs(t.montant), 0)
    }
    return { periode: r.periode, label: moisCourt(r.periode), values }
  })

  const nMonths = months.length || 1

  // Moyenne par poste sur la période
  const moyenneParCat: Record<string, number> = {}
  for (const cat of BUDGET_CATEGORIES) {
    moyenneParCat[cat] = months.reduce((s, m) => s + (m.values[cat] ?? 0), 0) / nMonths
  }

  // Totaux mensuels (somme des postes variables suivis)
  const totauxMensuels = months.map(m => ({
    label: m.label,
    total: BUDGET_CATEGORIES.reduce((s, cat) => s + (m.values[cat] ?? 0), 0),
  }))
  const moyTotal = totauxMensuels.reduce((s, t) => s + t.total, 0) / nMonths
  const moisMax = totauxMensuels.reduce((a, b) => (b.total > a.total ? b : a), totauxMensuels[0] ?? { label: '—', total: 0 })
  const moisMin = totauxMensuels.reduce((a, b) => (b.total < a.total ? b : a), totauxMensuels[0] ?? { label: '—', total: 0 })
  const objectifTotal = BUDGET_CATEGORIES.reduce((s, cat) => s + cible(cat), 0)
  const ecartPct = moyTotal > 0 ? Math.round(((objectifTotal - moyTotal) / moyTotal) * 100) : 0

  // Catégories triées par moyenne décroissante (pour graphe + tableau)
  const catsSorted = [...BUDGET_CATEGORIES].sort((a, b) => moyenneParCat[b] - moyenneParCat[a])

  const chartCategories: EvolutionCat[] = catsSorted.map(cat => ({
    cat,
    label: CATEGORIE_LABELS[cat as Categorie] ?? cat,
    color: CATEGORIE_COLORS[cat as Categorie] ?? '#ccc',
  }))
  const targets: Record<string, number> = Object.fromEntries(catsSorted.map(cat => [cat, cible(cat)]))

  const budgetRows: BudgetRow[] = catsSorted.map(cat => ({
    cat,
    label: CATEGORIE_LABELS[cat as Categorie] ?? cat,
    color: CATEGORIE_COLORS[cat as Categorie] ?? '#ccc',
    moyenne: moyenneParCat[cat],
    cible: cible(cat),
  }))

  return (
    <div className="flex min-h-screen">
      <Sidebar releves={relevesNav} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="bg-white border-b border-[#ebebeb] px-7 py-3.5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-baseline gap-2.5">
            <span className="text-[16px] font-bold tracking-[-0.3px]">Vue d&apos;ensemble</span>
            <span className="text-[12px] text-[#999]">dépenses variables · {nMonths} mois</span>
          </div>
        </div>

        <div className="p-7 flex flex-col gap-5 overflow-y-auto">

          {releves.length === 0 ? (
            <div className="bg-white border border-[#ebebeb] rounded-xl p-10 text-center">
              <p className="text-[14px] font-semibold mb-1">Aucune donnée</p>
              <p className="text-[13px] text-[#999]">Importez des relevés pour voir vos tendances.</p>
            </div>
          ) : (
            <>
              {/* Cartes indicateurs */}
              <div className="grid grid-cols-4 gap-3.5">
                <div className="bg-white border border-[#ebebeb] rounded-xl p-5">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#bbb] mb-1.5">Moy / mois</div>
                  <div className="text-[22px] font-bold tracking-[-0.5px]">{fmtAmount(moyTotal)}</div>
                  <div className="text-[11px] text-[#999] mt-0.5">sur {nMonths} mois</div>
                </div>
                <div className="bg-white border border-[#ebebeb] rounded-xl p-5">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#bbb] mb-1.5">Mois le + élevé</div>
                  <div className="text-[22px] font-bold tracking-[-0.5px]">{fmtAmount(moisMax.total)}</div>
                  <div className="text-[11px] text-[#e53e3e] mt-0.5">{moisMax.label}</div>
                </div>
                <div className="bg-white border border-[#ebebeb] rounded-xl p-5">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#bbb] mb-1.5">Mois le + bas</div>
                  <div className="text-[22px] font-bold tracking-[-0.5px]">{fmtAmount(moisMin.total)}</div>
                  <div className="text-[11px] text-[#00b37e] mt-0.5">{moisMin.label}</div>
                </div>
                <div className="bg-white border border-[#ebebeb] rounded-xl p-5">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#bbb] mb-1.5">Objectif total</div>
                  <div className="text-[22px] font-bold tracking-[-0.5px]">{fmtAmount(objectifTotal)}</div>
                  <div className={`text-[11px] mt-0.5 ${ecartPct <= 0 ? 'text-[#00b37e]' : 'text-[#e53e3e]'}`}>
                    {ecartPct > 0 ? '+' : ''}{ecartPct}%
                  </div>
                </div>
              </div>

              {/* Graphe évolution */}
              <div className="bg-white border border-[#ebebeb] rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#f2f2f2] flex items-center justify-between">
                  <span className="text-[13.5px] font-bold tracking-[-0.2px]">Dépenses variables — réel vs objectif</span>
                  <span className="text-[11.5px] text-[#999]">trait = ta cible</span>
                </div>
                <div className="p-5">
                  <VariableEvolutionChart months={months} categories={chartCategories} targets={targets} />
                </div>
              </div>

              {/* Tableau budgets */}
              <div className="bg-white border border-[#ebebeb] rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#f2f2f2] flex items-center justify-between">
                  <span className="text-[13.5px] font-bold tracking-[-0.2px]">Budgets par poste</span>
                  <span className="text-[11.5px] text-[#999]">cible éditable · moyenne sur {nMonths} mois</span>
                </div>
                <BudgetTable rows={budgetRows} />
              </div>

              <InvestmentCapacity />
            </>
          )}

        </div>
      </main>
    </div>
  )
}
