'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CategoryBadge } from './CategoryBadge'
import { TagModal } from './TagModal'
import type { Transaction } from '@prisma/client'

interface TransactionListProps {
  transactions: Transaction[]
}

const FILTER_CATS = ['Logement', 'Alimentation', 'Restos', 'Transport', 'Shopping', 'Abonnement']

export function TransactionList({ transactions }: TransactionListProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [tagTarget, setTagTarget] = useState<Transaction | null>(null)

  const filtered = transactions.filter(t => {
    if (t.exclure) return false
    if (filter === 'uncategorized') return t.categorie === 'NON_CATEGORISE'
    if (filter !== 'all') return t.categorie.toLowerCase().includes(filter.toLowerCase())
    if (search) return t.libelle.toLowerCase().includes(search.toLowerCase())
    return true
  })

  const uncategorizedCount = transactions.filter(t => !t.exclure && t.categorie === 'NON_CATEGORISE').length

  const formatDate = (d: Date | string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })

  const formatAmount = (m: number) =>
    `${m >= 0 ? '+' : ''}${m.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

  return (
    <>
      {/* Filters */}
      <div className="px-5 py-3 border-b border-[#f2f2f2] flex items-center gap-2 flex-wrap">
        {[{ key: 'all', label: 'Toutes' }, ...FILTER_CATS.map(c => ({ key: c, label: c }))].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1 rounded-full text-[12px] font-medium border transition-all ${
              filter === key
                ? 'bg-[#f0fdf8] text-[#00b37e] border-[#c6f0e2] font-semibold'
                : 'bg-transparent text-[#999] border-[#ebebeb] hover:text-[#111] hover:border-[#ddd]'
            }`}
          >
            {label}
          </button>
        ))}
        {uncategorizedCount > 0 && (
          <button
            onClick={() => setFilter('uncategorized')}
            className={`px-3 py-1 rounded-full text-[12px] font-medium border transition-all ${
              filter === 'uncategorized'
                ? 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]'
                : 'bg-transparent text-[#d97706] border-[#fde68a] hover:bg-[#fffbeb]'
            }`}
          >
            ⚠ Non catégorisées ({uncategorizedCount})
          </button>
        )}
        <input
          className="ml-auto border border-[#ebebeb] rounded-lg px-3 py-1.5 text-[12.5px] bg-[#f7f7f5] outline-none focus:border-[#ccc] focus:bg-white w-44 transition-all"
          placeholder="Rechercher…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#fafafa]">
              <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#bbb] px-4 py-2.5 border-b border-[#f2f2f2] w-20">Date</th>
              <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#bbb] px-4 py-2.5 border-b border-[#f2f2f2]">Libellé</th>
              <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#bbb] px-4 py-2.5 border-b border-[#f2f2f2] w-44">Catégorie</th>
              <th className="text-right text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#bbb] px-4 py-2.5 border-b border-[#f2f2f2] w-32">Montant</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr
                key={t.id}
                className={`border-b border-[#f9f9f9] hover:bg-[#fafafa] transition-colors ${
                  t.categorie === 'NON_CATEGORISE' ? 'bg-[#fffdf5] hover:bg-[#fffbeb] cursor-pointer' : ''
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
                  <div className="text-[10.5px] text-[#bbb] font-mono mt-0.5">{t.libelleRaw}</div>
                </td>
                <td className="px-4 py-2.5">
                  <CategoryBadge categorie={t.categorie} />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className={`text-[13px] font-semibold tabular-nums ${
                    t.montant > 0 ? 'text-[#00b37e]' :
                    t.categorie === 'NON_CATEGORISE' ? 'text-[#d97706]' :
                    'text-[#e53e3e]'
                  }`}>
                    {formatAmount(t.montant)}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[13px] text-[#bbb]">
                  Aucune transaction
                </td>
              </tr>
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
