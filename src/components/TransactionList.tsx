'use client'
import { useState, useMemo, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { CategoryBadge } from './CategoryBadge'
import { TagModal } from './TagModal'
import { CATEGORIE_LABELS, CATEGORIE_COLORS, type Categorie } from '@/lib/categories'
import type { Transaction } from '@prisma/client'

interface TransactionListProps {
  transactions: Transaction[]
}

const CAT_ORDER = [
  'SALAIRE','PRIME','NOTE_FRAIS','REMBOURSEMENT_DIVERS','REVENU_EXCEPTIONNEL',
  'LOGEMENT','REMBOURSEMENT_DETTE','ASSURANCE','ABONNEMENT','EPARGNE',
  'RESTOS_BARS','ALIMENTATION','TRANSPORT','SHOPPING','SANTE','CASH_DAB',
  'IMPOTS','NON_CATEGORISE',
]

export function TransactionList({ transactions }: TransactionListProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [grouped, setGrouped] = useState(true)
  const [tagTarget, setTagTarget] = useState<Transaction | null>(null)

  const actives = useMemo(() => transactions.filter(t => !t.exclure), [transactions])
  const uncategorizedCount = useMemo(() => actives.filter(t => t.categorie === 'NON_CATEGORISE').length, [actives])

  const presentCats = useMemo(() => {
    const cats = new Set(actives.map(t => t.categorie))
    return CAT_ORDER.filter(c => cats.has(c))
  }, [actives])

  const filtered = useMemo(() => {
    return actives.filter(t => {
      if (filter === 'uncategorized') return t.categorie === 'NON_CATEGORISE'
      if (filter !== 'all') return t.categorie === filter
      if (search) return (
        t.libelle.toLowerCase().includes(search.toLowerCase()) ||
        (t.libelleRaw ?? '').toLowerCase().includes(search.toLowerCase())
      )
      return true
    })
  }, [actives, filter, search])

  const groups = useMemo(() => {
    if (!grouped || filter !== 'all' || search) return null
    const map = new Map<string, Transaction[]>()
    for (const t of filtered) {
      const g = map.get(t.categorie) ?? []
      g.push(t)
      map.set(t.categorie, g)
    }
    return CAT_ORDER
      .filter(cat => map.has(cat))
      .map(cat => ({
        cat,
        txs: (map.get(cat) ?? []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        total: (map.get(cat) ?? []).reduce((s, t) => s + t.montant, 0),
      }))
  }, [filtered, grouped, filter, search])

  const formatDate = (d: Date | string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })

  const formatAmount = (m: number) =>
    `${m >= 0 ? '+' : ''}${m.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

  const renderRow = (t: Transaction) => (
    <tr
      key={t.id}
      className={`border-b border-[#f9f9f9] hover:bg-[#fafafa] transition-colors ${
        t.categorie === 'NON_CATEGORISE' ? 'bg-[#fffdf5] hover:bg-[#fffbeb] cursor-pointer' : 'cursor-default'
      }`}
      onClick={() => t.categorie === 'NON_CATEGORISE' && setTagTarget(t)}
    >
      <td className="px-4 py-2.5">
        <span className="font-mono text-[11.5px] text-[#999]">{formatDate(t.date)}</span>
      </td>
      <td className="px-4 py-2.5">
        <div className={`text-[13px] font-medium ${t.categorie === 'NON_CATEGORISE' ? 'text-[#d97706]' : 'text-[#111]'}`}>
          {t.categorie === 'NON_CATEGORISE' && '⚠ '}{t.libelle}
        </div>
      </td>
      <td className="px-4 py-2.5">
        <CategoryBadge categorie={t.categorie} />
      </td>
      <td className="px-4 py-2.5 text-right">
        <span className={`text-[13px] font-semibold tabular-nums ${
          t.montant > 0 ? 'text-[#00b37e]' :
          t.categorie === 'NON_CATEGORISE' ? 'text-[#d97706]' :
          'text-[#111]'
        }`}>
          {formatAmount(t.montant)}
        </span>
      </td>
    </tr>
  )

  return (
    <>
      {/* Filter chips */}
      <div className="px-4 pt-3 pb-2 border-b border-[#f2f2f2]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => { setFilter('all'); setSearch(''); setGrouped(true) }}
            className={`px-2.5 py-1 rounded-full text-[11.5px] font-medium border transition-all shrink-0 ${
              filter === 'all'
                ? 'bg-[#111] text-white border-[#111]'
                : 'bg-transparent text-[#888] border-[#e5e5e5] hover:border-[#bbb] hover:text-[#333]'
            }`}
          >
            Tout
          </button>

          {presentCats.filter(c => c !== 'NON_CATEGORISE').map(cat => {
            const color = CATEGORIE_COLORS[cat as Categorie] ?? '#ccc'
            const active = filter === cat
            return (
              <button
                key={cat}
                onClick={() => { setFilter(cat); setGrouped(false); setSearch('') }}
                className="px-2.5 py-1 rounded-full text-[11.5px] font-medium border transition-all shrink-0"
                style={active ? {
                  background: color,
                  color: '#fff',
                  borderColor: color,
                } : {
                  background: color + '12',
                  color: color,
                  borderColor: color + '40',
                }}
              >
                {CATEGORIE_LABELS[cat as Categorie] ?? cat}
              </button>
            )
          })}

          {uncategorizedCount > 0 && (
            <button
              onClick={() => { setFilter('uncategorized'); setGrouped(false); setSearch('') }}
              className={`px-2.5 py-1 rounded-full text-[11.5px] font-medium border transition-all shrink-0 ${
                filter === 'uncategorized'
                  ? 'bg-[#d97706] text-white border-[#d97706]'
                  : 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]'
              }`}
            >
              ⚠ À taguer ({uncategorizedCount})
            </button>
          )}

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button
              onClick={() => { setGrouped(g => !g); setFilter('all'); setSearch('') }}
              className={`px-2.5 py-1 rounded-lg text-[11.5px] font-medium border transition-all ${
                grouped
                  ? 'bg-[#f0fdf8] text-[#00b37e] border-[#c6f0e2]'
                  : 'text-[#888] border-[#e5e5e5] hover:text-[#333]'
              }`}
            >
              ≡ Par catégorie
            </button>
            <input
              className="border border-[#ebebeb] rounded-lg px-3 py-1 text-[12px] bg-[#f7f7f5] outline-none focus:border-[#ccc] focus:bg-white w-36 transition-all"
              placeholder="Rechercher…"
              value={search}
              onChange={e => { setSearch(e.target.value); setGrouped(false) }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#fafafa]">
              <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#bbb] px-4 py-2.5 border-b border-[#f2f2f2] w-16">Date</th>
              <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#bbb] px-4 py-2.5 border-b border-[#f2f2f2]">Libellé</th>
              <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#bbb] px-4 py-2.5 border-b border-[#f2f2f2] w-40">Catégorie</th>
              <th className="text-right text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#bbb] px-4 py-2.5 border-b border-[#f2f2f2] w-32">Montant</th>
            </tr>
          </thead>
          <tbody>
            {groups ? (
              groups.map(({ cat, txs, total }) => (
                <Fragment key={cat}>
                  <tr className="bg-[#f7f7f5] border-b border-[#ebebeb]">
                    <td colSpan={2} className="px-4 py-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: CATEGORIE_COLORS[cat as Categorie] ?? '#ccc' }}
                        />
                        <span className="text-[11px] font-bold text-[#444] uppercase tracking-[0.6px]">
                          {CATEGORIE_LABELS[cat as Categorie] ?? cat}
                        </span>
                        <span className="text-[10.5px] text-[#bbb]">{txs.length} op.</span>
                      </div>
                    </td>
                    <td />
                    <td className="px-4 py-1.5 text-right">
                      <span className={`text-[12px] font-bold tabular-nums ${total >= 0 ? 'text-[#00b37e]' : 'text-[#555]'}`}>
                        {formatAmount(total)}
                      </span>
                    </td>
                  </tr>
                  {txs.map(renderRow)}
                </Fragment>
              ))
            ) : (
              <>
                {filtered.map(renderRow)}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[13px] text-[#bbb]">
                      Aucune transaction
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {tagTarget && (
        <TagModal
          transaction={tagTarget}
          onClose={() => setTagTarget(null)}
          onSaved={() => { setTagTarget(null); router.refresh() }}
        />
      )}
    </>
  )
}
