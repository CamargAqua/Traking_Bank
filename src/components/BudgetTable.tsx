'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface BudgetRow {
  cat: string
  label: string
  color: string
  moyenne: number
  cible: number
}

interface BudgetTableProps {
  rows: BudgetRow[]
}

function fmt(n: number) {
  return Math.round(n).toLocaleString('fr-FR') + ' €'
}

export function BudgetTable({ rows }: BudgetTableProps) {
  const router = useRouter()
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(rows.map(r => [r.cat, String(Math.round(r.cible))]))
  )
  const [saving, setSaving] = useState<string | null>(null)

  async function save(cat: string) {
    const montantCible = parseFloat(drafts[cat])
    if (!Number.isFinite(montantCible) || montantCible < 0) return
    const row = rows.find(r => r.cat === cat)
    if (row && Math.round(row.cible) === Math.round(montantCible)) return // inchangé
    setSaving(cat)
    try {
      await fetch('/api/budgets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categorie: cat, montantCible }),
      })
      router.refresh()
    } finally {
      setSaving(null)
    }
  }

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-[#fafafa]">
          <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.6px] text-[#bbb] px-4 py-2.5 border-b border-[#f2f2f2]">Poste</th>
          <th className="text-right text-[10.5px] font-semibold uppercase tracking-[0.6px] text-[#bbb] px-4 py-2.5 border-b border-[#f2f2f2] w-28">Moy / mois</th>
          <th className="text-right text-[10.5px] font-semibold uppercase tracking-[0.6px] text-[#bbb] px-4 py-2.5 border-b border-[#f2f2f2] w-28">🎯 Cible</th>
          <th className="text-right text-[10.5px] font-semibold uppercase tracking-[0.6px] text-[#bbb] px-4 py-2.5 border-b border-[#f2f2f2] w-24">Écart</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => {
          const cible = parseFloat(drafts[r.cat]) || 0
          const ecart = r.moyenne - cible
          const over = ecart > 0
          return (
            <tr key={r.cat} className="border-b border-[#f9f9f9] last:border-0">
              <td className="px-4 py-2.5">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.color }} />
                  <span className="text-[13px] font-medium">{r.label}</span>
                </span>
              </td>
              <td className="px-4 py-2.5 text-right text-[13px] tabular-nums text-[#555]">{fmt(r.moyenne)}</td>
              <td className="px-4 py-2.5 text-right">
                <span className="inline-flex items-center gap-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    className="w-[78px] text-right border border-[#e5e5e5] rounded-md px-2 py-1 text-[13px] tabular-nums bg-[#f7f7f5] outline-none focus:border-[#00b37e] focus:bg-white transition-all"
                    value={drafts[r.cat]}
                    onChange={e => setDrafts(d => ({ ...d, [r.cat]: e.target.value }))}
                    onBlur={() => save(r.cat)}
                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                    disabled={saving === r.cat}
                  />
                  <span className="text-[12px] text-[#999]">€</span>
                </span>
              </td>
              <td className="px-4 py-2.5 text-right">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium tabular-nums ${
                    over ? 'bg-[#fdecec] text-[#a32d2d]' : 'bg-[#e1f5ee] text-[#0f6e56]'
                  }`}
                >
                  {over ? `+${fmt(ecart)}` : 'OK'}
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
