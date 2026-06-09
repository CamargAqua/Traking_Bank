'use client'
import { useState } from 'react'
import { CATEGORIE_LABELS, CATEGORIE_COLORS, type Categorie } from '@/lib/categories'

interface ChargeTx {
  libelle: string
  montant: number
}

interface ChargeItem {
  cat: string
  total: number
  txs: ChargeTx[]
}

interface ChargesAccordionProps {
  items: ChargeItem[]
}

function fmtAmount(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export function ChargesAccordion({ items }: ChargesAccordionProps) {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-1.5">
      {items.map(({ cat, total, txs }) => {
        const isOpen = open === cat
        const isDeduction = total < 0
        const color = isDeduction ? '#00b37e' : (CATEGORIE_COLORS[cat as Categorie] ?? '#ccc')
        const label = isDeduction ? 'Part. Luana' : (CATEGORIE_LABELS[cat as Categorie] ?? cat)

        return (
          <div key={cat} className={`border rounded-lg overflow-hidden ${isDeduction ? 'border-[#d1fae5]' : 'border-[#f0f0f0]'}`}>
            <button
              onClick={() => setOpen(isOpen ? null : cat)}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 transition-colors text-left ${isDeduction ? 'hover:bg-[#f0fdf4]' : 'hover:bg-[#fafafa]'}`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-[12.5px] font-medium text-[#444] flex-1">{label}</span>
              <span className={`text-[12.5px] font-bold tabular-nums ${isDeduction ? 'text-[#00b37e]' : 'text-[#111]'}`}>
                {isDeduction ? `−${fmtAmount(Math.abs(total))}` : fmtAmount(total)}
              </span>
              <span className={`text-[10px] text-[#bbb] transition-transform ml-1 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {isOpen && (
              <div className="border-t border-[#f5f5f5] bg-[#fafafa]">
                {txs.map((t, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-1.5 border-b border-[#f5f5f5] last:border-0">
                    <span className="text-[11.5px] text-[#666] truncate max-w-[65%]">{t.libelle}</span>
                    <span className={`text-[11.5px] font-semibold tabular-nums shrink-0 ${t.montant > 0 ? 'text-[#00b37e]' : 'text-[#333]'}`}>
                      {t.montant > 0 ? `+${fmtAmount(t.montant)}` : fmtAmount(Math.abs(t.montant))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
